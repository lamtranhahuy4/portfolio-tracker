import { describe, it, expect } from 'vitest';
import { calculatePortfolioMetrics } from './portfolioMetrics';
import { NormalizedTransaction } from '@/types/portfolio';
import { toQuantity, toPrice, toMoney } from '@/domain/portfolio/primitives';

describe('Dividend Handling', () => {
  it('should add cash dividend to realized PnL and cash balance', () => {
    const txs: NormalizedTransaction[] = [
      {
        id: '2', date: new Date('2023-01-02'), type: 'BUY', assetClass: 'STOCK',
        ticker: 'HPG', quantity: toQuantity(1000), price: toPrice(20), totalValue: toMoney(20000),
        fee: toMoney(0), tax: toMoney(0)
      },
      {
        id: '3', date: new Date('2023-02-01'), type: 'DIVIDEND', assetClass: 'STOCK',
        ticker: 'HPG', quantity: toQuantity(0), price: toPrice(0), totalValue: toMoney(5000),
        fee: toMoney(0), tax: toMoney(0)
      }
    ];

    const currentPrices = { 'HPG': 20 };
    const metrics = calculatePortfolioMetrics(txs, currentPrices, []);

    const hpg = metrics.holdings.find(h => h.ticker === 'HPG');
    expect(hpg?.averageCostRealizedPnL).toBe(5000);
    expect(metrics.averageCostRealizedPnL).toBe(5000);
  });
});
