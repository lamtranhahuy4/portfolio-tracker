import { describe, expect, it } from 'vitest';
import { calculatePortfolioMetrics } from '../portfolioMetrics';
import { NormalizedTransaction } from '@/types/portfolio';
import { toQuantity, toPrice, toMoney } from '@/domain/portfolio/primitives';

describe('Dividend Handling Tests', () => {
  const defaultCurrentPrices: Record<string, number> = {};

  it('STOCK_DIVIDEND tăng lượng cổ phiếu nhưng KHÔNG thay đổi cost basis', () => {
    const transactions: NormalizedTransaction[] = [
      {
        id: '1', date: new Date('2023-01-01'), type: 'DEPOSIT', assetClass: 'CASH', ticker: 'CASH_VND',
        quantity: toQuantity(100000000), price: toPrice(1), fee: toMoney(0), tax: toMoney(0), totalValue: toMoney(100000000)
      },
      // Mua lô cơ sở: 1000 cổ giá 20k
      {
        id: '2', date: new Date('2023-01-02'), type: 'BUY', assetClass: 'STOCK', ticker: 'FPT',
        quantity: toQuantity(1000), price: toPrice(20000), fee: toMoney(0), tax: toMoney(0), totalValue: toMoney(20000000)
      },
      // Nhận cổ tức bằng cổ phiếu: 100 cổ, price = 0
      {
        id: '3', date: new Date('2023-01-03'), type: 'STOCK_DIVIDEND', assetClass: 'STOCK', ticker: 'FPT',
        quantity: toQuantity(100), price: toPrice(0), fee: toMoney(0), tax: toMoney(0), totalValue: toMoney(0)
      }
    ];

    const metrics = calculatePortfolioMetrics(transactions, defaultCurrentPrices, [], null);
    const fptHolding = metrics.holdings.find(h => h.ticker === 'FPT');
    
    expect(fptHolding).toBeDefined();
    // Tổng số cổ phiếu = 1000 + 100 = 1100
    expect(fptHolding?.totalShares).toBe(1100);
    // Vốn bỏ ra vẫn chỉ là 20.000.000 (Cost basis hiện tại không bị đội lên)
    expect(Math.round(metrics.currentCostBasis)).toBe(20000000);
  });

  it('SELL cổ phiếu thưởng sẽ dồn toàn bộ tiền vào fifoRealizedPnL', () => {
    const transactions: NormalizedTransaction[] = [
      {
        id: '1', date: new Date('2023-01-01'), type: 'DEPOSIT', assetClass: 'CASH', ticker: 'CASH_VND',
        quantity: toQuantity(100000000), price: toPrice(1), fee: toMoney(0), tax: toMoney(0), totalValue: toMoney(100000000)
      },
      // Mua lô cơ sở: 100 cổ giá 20k
      {
        id: '2', date: new Date('2023-01-02'), type: 'BUY', assetClass: 'STOCK', ticker: 'FPT',
        quantity: toQuantity(100), price: toPrice(20000), fee: toMoney(0), tax: toMoney(0), totalValue: toMoney(2000000)
      },
      // Cổ tức bằng cổ phiếu: 20 cổ
      {
        id: '3', date: new Date('2023-01-03'), type: 'STOCK_DIVIDEND', assetClass: 'STOCK', ticker: 'FPT',
        quantity: toQuantity(20), price: toPrice(0), fee: toMoney(0), tax: toMoney(0), totalValue: toMoney(0)
      },
      // Bán 120 cổ (Lô 1: 100, Lô 2 - cổ tức: 20) @ 30k, tax = 0, fee = 0
      {
        id: '4', date: new Date('2023-01-04'), type: 'SELL', assetClass: 'STOCK', ticker: 'FPT',
        quantity: toQuantity(120), price: toPrice(30000), fee: toMoney(0), tax: toMoney(0), totalValue: toMoney(3600000)
      }
    ];

    const metrics = calculatePortfolioMetrics(transactions, defaultCurrentPrices, [], null);
    
    // Cost basis của lô 1: 2,000,000. Lô 2 (cổ tức): 0. Tổng cost: 2,000,000
    // Proceeds bán 120 cổ: 120 * 30,000 = 3,600,000
    // FIFO PnL = 3,600,000 - 2,000,000 = 1,600,000
    // Trong đó chứa lãi từ 100 cổ gốc: 1,000,000. Lãi từ 20 cổ thưởng (vốn 0đ): 600,000. Tổng: 1,600,000.
    expect(metrics.fifoRealizedPnL).toBe(1600000);
  });
});
