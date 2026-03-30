import { describe, expect, it } from 'vitest';
import { calculatePortfolioMetrics } from '../../../lib/portfolioMetrics';
import { CashLedgerEvent, Transaction } from '../../../types/portfolio';

describe('portfolioMetrics Golden Tests - Legacy Engine', () => {
  const defaultCurrentPrices: Record<string, number> = {};

  it('Case 1: Tính net contributions từ transactions ở Derived Mode', () => {
    const transactions: Transaction[] = [
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
    const transactions: Transaction[] = [
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
    const transactions: Transaction[] = [
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

    const cashEvents: CashLedgerEvent[] = [
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
    const transactions: Transaction[] = [
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
    expect(hpgHolding).toBeDefined();
    expect(hpgHolding?.totalShares).toBe(0);
  });
});
