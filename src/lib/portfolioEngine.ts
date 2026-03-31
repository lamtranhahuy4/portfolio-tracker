import { Holding, Transaction } from '../types/portfolio';
import { calculatePortfolioMetrics } from '@/domain/portfolio/portfolioMetrics';

export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, number>
): Holding[] {
  return calculatePortfolioMetrics(transactions, currentPrices, []).holdings;
}
