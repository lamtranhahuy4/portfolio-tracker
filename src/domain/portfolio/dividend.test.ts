import { describe, it, expect } from 'vitest';
import { calculatePortfolioMetrics } from './portfolioMetrics';
import { NormalizedTransaction } from '@/types/portfolio';
import Decimal from 'decimal.js';

describe('Dividend Handling', () => {
  it('should add cash dividend to realized PnL and cash balance', () => {
    const txs: NormalizedTransaction[] = [
      {
        id: '2', date: new Date('2023-01-02'), type: 'BUY', assetClass: 'STOCK',
        ticker: 'HPG', quantity: new Decimal(1000), price: new Decimal(20), totalValue: new Decimal(20000),
        fee: new Decimal(0), tax: new Decimal(0)
      },
      {
        id: '3', date: new Date('2023-02-01'), type: 'DIVIDEND', assetClass: 'STOCK',
        ticker: 'HPG', quantity: new Decimal(0), price: new Decimal(0), totalValue: new Decimal(5000),
        fee: new Decimal(0), tax: new Decimal(0)
      }
    ];

    const currentPrices = { 'HPG': 20 };
    const metrics = calculatePortfolioMetrics(txs, currentPrices, []);

    const hpg = metrics.holdings.find(h => h.ticker === 'HPG');
    expect(hpg?.averageCostRealizedPnL).toBe(5000);
    expect(metrics.averageCostRealizedPnL).toBe(5000);
  });
});
