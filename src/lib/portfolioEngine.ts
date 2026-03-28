import { Holding, Transaction } from '../types/portfolio';
import { calculatePortfolioMetrics } from './portfolioMetrics';

export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, number>
): Holding[] {
  return calculatePortfolioMetrics(transactions, currentPrices).holdings;
}
