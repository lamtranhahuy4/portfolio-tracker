/**
 * Internal domain entity types used by the portfolio calculation engine.
 *
 * These are "internal" value objects — they live only in memory during a
 * transaction replay and are never persisted or exposed over the API.
 * Extracting them here makes them importable independently for testing.
 */
import Decimal from 'decimal.js';
import { Holding } from '@/types/portfolio';

/**
 * Mutable accumulator for a single ticker during the FIFO replay loop.
 * Tracks gross buy value, allocated fees/taxes, and realized PnL under
 * both the average-cost and FIFO methodologies.
 */
export type HoldingState = {
  assetClass: Holding['assetClass'];
  ticker: string;
  totalShares: Decimal;
  grossBuyValueRemaining: Decimal;
  allocatedBuyFeesRemaining: Decimal;
  allocatedBuyTaxRemaining: Decimal;
  averageCostRealizedPnL: Decimal;
  fifoRealizedPnL: Decimal;
};

/**
 * A single FIFO lot created by a BUY (or STOCK_DIVIDEND) transaction.
 * `remainingQty` decreases as SELL transactions consume the lot.
 */
export type Lot = {
  remainingQty: Decimal;
  /** Net cost per share (gross price / qty) — excludes fees and taxes */
  unitCostNet: Decimal;
  unitCostFee: Decimal;
  unitCostTax: Decimal;
};

/**
 * Full mutable state threaded through `applyTransaction` for each event
 * in the chronologically-sorted transaction history.
 */
export type ReplayState = {
  holdingsMap: Map<string, HoldingState>;
  lotsMap: Map<string, Lot[]>;
  lastKnownPrices: Map<string, Decimal>;
  netContributions: Decimal;
  calculationWarnings: string[];
};
