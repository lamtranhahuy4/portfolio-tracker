import { describe, expect, it } from 'vitest';
import { calculatePortfolioMetrics } from '../portfolioMetrics';
import { CashLedgerEvent, Transaction } from '@/types/portfolio';

describe('portfolioMetrics Golden Tests - Legacy Engine', () => {
  const defaultCurrentPrices: Record<string, number> = {};

  it('Case 1: Tính net contributions từ transactions ở Derived Mode', () => {
    const transactions: any[] = [
      {
        id: '1',
        date: new Date('2023-01-01T00:00:00.000Z'),
        type: 'DEPOSIT',
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        quantity: 10000000,
        price: 1,
        fee: 0,
        tax: 0,
        totalValue: 10000000,
      },
      {
        id: '2',
        date: new Date('2023-01-02T00:00:00.000Z'),
        type: 'WITHDRAW',
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        quantity: 2000000,
        price: 1,
        fee: 0,
        tax: 0,
        totalValue: 2000000,
      },
    ];

    const metrics = calculatePortfolioMetrics(transactions, defaultCurrentPrices, [], null);

    expect(metrics.netContributions).toBe(8000000);
    expect(metrics.cashBalanceSource).toBe('derived');
  });

  it('Case 2: Tính FIFO realized PnL với BUY/SELL cơ bản', () => {
    const transactions: any[] = [
      {
        id: '1',
        date: new Date('2023-01-01T00:00:00.000Z'),
        type: 'DEPOSIT',
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        quantity: 100000000,
        price: 1,
        fee: 0,
        tax: 0,
        totalValue: 100000000,
      },
      {
        id: '2',
        date: new Date('2023-01-02T00:00:00.000Z'),
        type: 'BUY',
        assetClass: 'STOCK',
        ticker: 'HPG',
        quantity: 1000,
        price: 20000,
        fee: 0,
        tax: 0,
        totalValue: 20000000,
      },
      {
        id: '3',
        date: new Date('2023-01-03T00:00:00.000Z'),
        type: 'SELL',
        assetClass: 'STOCK',
        ticker: 'HPG',
        quantity: 500,
        price: 25000,
        fee: 0,
        tax: 0,
        totalValue: 12500000,
      },
    ];

    const metrics = calculatePortfolioMetrics(transactions, defaultCurrentPrices, [], null);

    const hpgHolding = metrics.holdings.find((h) => h.ticker === 'HPG');
    expect(hpgHolding).toBeDefined();
    expect(hpgHolding?.totalShares).toBe(500);
    expect(metrics.fifoRealizedPnL).toBe(2500000);
    expect(metrics.calculationWarnings.length).toBe(0);
  });

  it('Case 3: Cash Ledger Mode thắng Derived Mode', () => {
    const transactions: any[] = [
      {
        id: '1',
        date: new Date('2023-01-01T00:00:00.000Z'),
        type: 'DEPOSIT',
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        quantity: 10000000,
        price: 1,
        fee: 0,
        tax: 0,
        totalValue: 10000000,
      },
    ];

    const cashEvents: any[] = [
      {
        id: 'evt-1',
        userId: 'usr1',
        date: new Date('2023-01-01T00:00:00.000Z'),
        direction: 'INFLOW',
        amount: 15000000,
        balanceAfter: 15000000,
        eventType: 'DEPOSIT',
        description: 'Nạp tiền',
        source: 'test-ledger',
      },
    ];

    const metrics = calculatePortfolioMetrics(transactions, defaultCurrentPrices, cashEvents, null);

    expect(metrics.cashBalanceSource).toBe('ledger');
    expect(metrics.netContributions).toBe(15000000);

    const cashHolding = metrics.holdings.find((h) => h.ticker === 'CASH_VND');
    expect(cashHolding?.totalShares).toBe(15000000);
    expect(metrics.cashBalanceEOD).toBe(15000000);
  });

  it('Case 4: Cảnh báo oversell khi bán vượt số lượng đang nắm giữ', () => {
    const transactions: any[] = [
      {
        id: '1',
        date: new Date('2023-01-01T00:00:00.000Z'),
        type: 'DEPOSIT',
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        quantity: 50000000,
        price: 1,
        fee: 0,
        tax: 0,
        totalValue: 50000000,
      },
      {
        id: '2',
        date: new Date('2023-01-02T00:00:00.000Z'),
        type: 'BUY',
        assetClass: 'STOCK',
        ticker: 'HPG',
        quantity: 1000,
        price: 20000,
        fee: 0,
        tax: 0,
        totalValue: 20000000,
      },
      {
        id: '3',
        date: new Date('2023-01-03T00:00:00.000Z'),
        type: 'SELL',
        assetClass: 'STOCK',
        ticker: 'HPG',
        quantity: 1500,
        price: 25000,
        fee: 0,
        tax: 0,
        totalValue: 37500000,
      },
    ];

    const metrics = calculatePortfolioMetrics(transactions, defaultCurrentPrices, [], null);

    expect(metrics.calculationWarnings.length).toBeGreaterThan(0);
    const warningText = metrics.calculationWarnings.join(' ');
    expect(warningText).toContain('exceeds holdings');
    expect(warningText).toContain('HPG');

    const hpgHolding = metrics.holdings.find((h) => h.ticker === 'HPG');
    expect(hpgHolding?.totalShares).toBe(0);
  });

  it('Case 5: FIFO với Fee/Tax phân bổ và partial lot clearance', () => {
    const transactions: any[] = [
      {
        id: '1', date: new Date('2023-01-01'), type: 'DEPOSIT', assetClass: 'CASH', ticker: 'CASH_VND',
        quantity: 100000000, price: 1, fee: 0, tax: 0, totalValue: 100000000
      },
      // Lot 1: 100 shares @ 20k, fee = 10k
      {
        id: '2', date: new Date('2023-01-02'), type: 'BUY', assetClass: 'STOCK', ticker: 'HPG',
        quantity: 100, price: 20000, fee: 10000, tax: 0, totalValue: 2000000
      },
      // Lot 2: 100 shares @ 22k, fee = 11k
      {
        id: '3', date: new Date('2023-01-03'), type: 'BUY', assetClass: 'STOCK', ticker: 'HPG',
        quantity: 100, price: 22000, fee: 11000, tax: 0, totalValue: 2200000
      },
      // Sell: 150 shares @ 30k, fee = 15k, tax = 4.5k
      {
        id: '4', date: new Date('2023-01-04'), type: 'SELL', assetClass: 'STOCK', ticker: 'HPG',
        quantity: 150, price: 30000, fee: 15000, tax: 4500, totalValue: 4500000
      }
    ];

    const metrics = calculatePortfolioMetrics(transactions, defaultCurrentPrices, [], null);

    const hpgHolding = metrics.holdings.find(h => h.ticker === 'HPG');
    expect(hpgHolding).toBeDefined();
    // Vị thế còn lại 50 shares
    expect(hpgHolding?.totalShares).toBe(50);
    
    // Cost basis của 50 chia lại thì sẽ rơi vào Lot 2: (100 @ 22k -> 50 @ 22k, fee = 5.5k)
    // Tức là vốn bị khoá là: 50 * 22000 = 1,100,000 vốn + 5,500 fee = 1,105,500
    // Lợi nhuận gộp từ khoản bán: Bán 150 @ 30k = 4,500,000
    // Giá vốn của 150 bán = Lot 1 full (2M vốn + 10k fee) + Lot 2 nửa (1.1M vốn + 5.5k fee) 
    // => Total FIFO cost = 3,115,500
    // Phí + Tax thực tế lúc bán = 15k + 4.5k = 19,500
    // Net Proceeds = 4,500,000 - 19,500 = 4,480,500
    // Mức lãi thực thu (FIFO Realized PnL) = Proceeds (4,480,500) - FIFO Cost (3,115,500) = 1,365,000
    expect(metrics.fifoRealizedPnL).toBe(1365000);

    const cashHolding = metrics.holdings.find(h => h.ticker === 'CASH_VND');
    // Cash ban đầu: 100M
    // Trừ mua 1: 2M - 10k fee = -2M (chú ý: totalValue là 2M nhẽ ra phải bao gồm fee trong DB thực, 
    // nhưng theo setup engine cash -= totalValue, vậy trừ đi 2M rồi 2.2M)
    // Thực tế mock setup ở trên cho tổng Value (giá x lượng). Ta tự trừ trong đầu: 100M - 2M - 2.2M = 95.8M. 
    // Tiền bán thu về = Proceeds (4,500k - 19.5k = 4,480,500)
    // Cash cuối: 95.8M + 4,480,500 = 100,280,500
    expect(cashHolding?.totalShares).toBe(100280500);
  });
});
