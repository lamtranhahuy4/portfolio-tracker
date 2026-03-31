import { describe, expect, it } from 'vitest';
import { calculatePortfolioMetrics } from '../portfolioMetrics';
import { CashLedgerEvent, Transaction } from '@/types/portfolio';

describe('portfolioMetrics regression coverage', () => {
  it('handles multi-lot fifo and average cost separately', () => {
    const transactions: any[] = [
      {
        id: 'd1',
        date: new Date('2024-01-01T00:00:00.000Z'),
        type: 'DEPOSIT',
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        quantity: 5000,
        price: 1,
        fee: 0,
        tax: 0,
        totalValue: 5000,
      },
      {
        id: 'b1',
        date: new Date('2024-01-02T00:00:00.000Z'),
        type: 'BUY',
        assetClass: 'STOCK',
        ticker: 'AAA',
        quantity: 100,
        price: 10,
        fee: 0,
        tax: 0,
        totalValue: 1000,
      },
      {
        id: 'b2',
        date: new Date('2024-01-03T00:00:00.000Z'),
        type: 'BUY',
        assetClass: 'STOCK',
        ticker: 'AAA',
        quantity: 100,
        price: 12,
        fee: 0,
        tax: 0,
        totalValue: 1200,
      },
      {
        id: 's1',
        date: new Date('2024-01-04T00:00:00.000Z'),
        type: 'SELL',
        assetClass: 'STOCK',
        ticker: 'AAA',
        quantity: 150,
        price: 15,
        fee: 0,
        tax: 0,
        totalValue: 2250,
      },
    ];

    const metrics = calculatePortfolioMetrics(transactions as any, {}, [], null);
    const holding = metrics.holdings.find((item) => item.ticker === 'AAA');

    expect(holding?.totalShares).toBe(50);
    expect(metrics.fifoRealizedPnL).toBe(650);
    expect(metrics.averageCostRealizedPnL).toBe(600);
    expect(metrics.calculationWarnings).toHaveLength(0);
  });

  it('keeps stock dividend at zero cost and cash dividend in cash balance', () => {
    const transactions: any[] = [
      {
        id: 'd1',
        date: new Date('2024-02-01T00:00:00.000Z'),
        type: 'DEPOSIT',
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        quantity: 1000,
        price: 1,
        fee: 0,
        tax: 0,
        totalValue: 1000,
      },
      {
        id: 'b1',
        date: new Date('2024-02-02T00:00:00.000Z'),
        type: 'BUY',
        assetClass: 'STOCK',
        ticker: 'BBB',
        quantity: 100,
        price: 10,
        fee: 0,
        tax: 0,
        totalValue: 1000,
      },
      {
        id: 'sd1',
        date: new Date('2024-02-03T00:00:00.000Z'),
        type: 'STOCK_DIVIDEND',
        assetClass: 'STOCK',
        ticker: 'BBB',
        quantity: 10,
        price: 0,
        fee: 0,
        tax: 0,
        totalValue: 0,
      },
      {
        id: 'cd1',
        date: new Date('2024-02-04T00:00:00.000Z'),
        type: 'DIVIDEND',
        assetClass: 'STOCK',
        ticker: 'BBB',
        quantity: 0,
        price: 0,
        fee: 0,
        tax: 0,
        totalValue: 50,
      },
    ];

    const metrics = calculatePortfolioMetrics(transactions as any, { BBB: 12 }, [], null);
    const stockHolding = metrics.holdings.find((item) => item.ticker === 'BBB');
    const cashHolding = metrics.holdings.find((item) => item.ticker === 'CASH_VND');

    expect(stockHolding?.totalShares).toBe(110);
    expect(stockHolding?.netAverageCost).toBeCloseTo(9.090909, 6);
    expect(cashHolding?.marketValue).toBe(50);
    expect(metrics.totalMarketValue).toBe(1370);
  });

  it('respects valuation snapshot dates', () => {
    const transactions: any[] = [
      {
        id: 'd1',
        date: new Date('2024-03-01T00:00:00.000Z'),
        type: 'DEPOSIT',
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        quantity: 1000,
        price: 1,
        fee: 0,
        tax: 0,
        totalValue: 1000,
      },
      {
        id: 'b1',
        date: new Date('2024-03-02T00:00:00.000Z'),
        type: 'BUY',
        assetClass: 'STOCK',
        ticker: 'CCC',
        quantity: 10,
        price: 10,
        fee: 0,
        tax: 0,
        totalValue: 100,
      },
      {
        id: 's1',
        date: new Date('2024-03-05T00:00:00.000Z'),
        type: 'SELL',
        assetClass: 'STOCK',
        ticker: 'CCC',
        quantity: 5,
        price: 12,
        fee: 0,
        tax: 0,
        totalValue: 60,
      },
    ];

    const snapshotMetrics = calculatePortfolioMetrics(
      transactions as any,
      { CCC: 20 },
      [],
      new Date('2024-03-03T00:00:00.000Z')
    );

    const currentMetrics = calculatePortfolioMetrics(transactions as any, { CCC: 20 }, [], null);
    const snapshotHolding = snapshotMetrics.holdings.find((item) => item.ticker === 'CCC');
    const currentHolding = currentMetrics.holdings.find((item) => item.ticker === 'CCC');

    expect(snapshotHolding?.totalShares).toBe(10);
    expect(currentHolding?.totalShares).toBe(5);
    expect(snapshotMetrics.fifoRealizedPnL).toBe(0);
    expect(currentMetrics.fifoRealizedPnL).toBe(10);
  });

  it('supports Oversell without breaking cost basis', () => {
    const transactions = [
      {
        id: 'b1', date: new Date('2024-04-01T00:00:00.000Z'),
        type: 'BUY', assetClass: 'STOCK', ticker: 'DDD',
        quantity: 100, price: 10, fee: 0, tax: 0, totalValue: 1000,
      },
      {
        id: 's1', date: new Date('2024-04-02T00:00:00.000Z'),
        type: 'SELL', assetClass: 'STOCK', ticker: 'DDD',
        quantity: 150, price: 15, fee: 0, tax: 0, totalValue: 2250,
      },
    ] as any;

    const metrics = calculatePortfolioMetrics(transactions, {}, [], null);
    const holding = metrics.holdings.find(item => item.ticker === 'DDD');
    
    expect(holding?.totalShares).toBe(-50); // Negative shares allowed
    expect(metrics.calculationWarnings.some(w => w.includes('Oversell'))).toBe(true);
    expect(holding?.marketValue).toBe(0);
  });

  it('detects ledger drift and generates reconciliation warnings', () => {
    const transactions = [
      {
        id: 'd1', date: new Date('2024-05-01T00:00:00.000Z'),
        type: 'DEPOSIT', assetClass: 'CASH', ticker: 'CASH_VND',
        quantity: 1000, price: 1, fee: 0, tax: 0, totalValue: 1000,
      }
    ] as any;

    // missing a deposit in ledger to trigger drift
    const events: CashLedgerEvent[] = [
      {
        id: 'e1', date: new Date('2024-05-01T00:00:00.000Z'),
        direction: 'INFLOW', amount: 500, balanceAfter: 500, eventType: 'DEPOSIT',
        description: '', source: ''
      }
    ] as any;

    const metrics = calculatePortfolioMetrics(transactions, {}, events, null);
    
    expect(metrics.cashBalanceEOD).toBe(500);
    expect(metrics.calculationWarnings.some(w => w.includes('[Reconciliation]'))).toBe(true);
  });
});
