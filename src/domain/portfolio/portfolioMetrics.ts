import Decimal from 'decimal.js';
import { DECIMAL_ONE, DECIMAL_ZERO, decimalMax, decimalMin, decimalSum, decimalToNumber, toDecimal, DecimalInput } from './decimal';
import { CashLedgerEvent, GroupedTransactionsByDay, Holding, NavPoint, OpeningPositionSnapshot, PortfolioMetrics, ReconciliationInsight, Transaction } from '@/types/portfolio';
import { toMoney, toQuantity, toPrice } from './primitives';

type HoldingState = {
  assetClass: Holding['assetClass'];
  ticker: string;
  totalShares: Decimal;
  grossBuyValueRemaining: Decimal;
  allocatedBuyFeesRemaining: Decimal;
  allocatedBuyTaxRemaining: Decimal;
  averageCostRealizedPnL: Decimal;
  fifoRealizedPnL: Decimal;
};

type Lot = {
  remainingQty: Decimal;
  unitCostNet: Decimal;
  unitCostFee: Decimal;
  unitCostTax: Decimal;
};

type ReplayState = {
  holdingsMap: Map<string, HoldingState>;
  lotsMap: Map<string, Lot[]>;
  lastKnownPrices: Map<string, Decimal>;
  netContributions: Decimal;
  calculationWarnings: string[];
};

function getDateKey(date: Date | string) {
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

function createEmptyState(): ReplayState {
  return {
    holdingsMap: new Map<string, HoldingState>(),
    lotsMap: new Map<string, Lot[]>(),
    lastKnownPrices: new Map<string, Decimal>(),
    netContributions: DECIMAL_ZERO,
    calculationWarnings: [],
  };
}

function getCashHolding(holdingsMap: Map<string, HoldingState>): HoldingState {
  if (!holdingsMap.has('CASH_VND')) {
    holdingsMap.set('CASH_VND', {
      assetClass: 'CASH',
      ticker: 'CASH_VND',
      totalShares: DECIMAL_ZERO,
      grossBuyValueRemaining: DECIMAL_ZERO,
      allocatedBuyFeesRemaining: DECIMAL_ZERO,
      allocatedBuyTaxRemaining: DECIMAL_ZERO,
      averageCostRealizedPnL: DECIMAL_ZERO,
      fifoRealizedPnL: DECIMAL_ZERO,
    });
  }
  return holdingsMap.get('CASH_VND')!;
}

function getStockHolding(holdingsMap: Map<string, HoldingState>, ticker: string): HoldingState {
  if (!holdingsMap.has(ticker)) {
    holdingsMap.set(ticker, {
      assetClass: 'STOCK',
      ticker,
      totalShares: DECIMAL_ZERO,
      grossBuyValueRemaining: DECIMAL_ZERO,
      allocatedBuyFeesRemaining: DECIMAL_ZERO,
      allocatedBuyTaxRemaining: DECIMAL_ZERO,
      averageCostRealizedPnL: DECIMAL_ZERO,
      fifoRealizedPnL: DECIMAL_ZERO,
    });
  }
  return holdingsMap.get(ticker)!;
}

function getLots(lotsMap: Map<string, Lot[]>, ticker: string) {
  if (!lotsMap.has(ticker)) {
    lotsMap.set(ticker, []);
  }
  return lotsMap.get(ticker)!;
}

function applyTransaction(state: ReplayState, tx: Transaction, ledgerMode: boolean) {
  const cash = getCashHolding(state.holdingsMap);
  const parsedDate = new Date(tx.date);
  const dateLabel = Number.isNaN(parsedDate.getTime()) ? String(tx.date) : parsedDate.toISOString();

  const txQuantity = toDecimal(tx.quantity);
  const txPrice = toDecimal(tx.price);
  const txFee = toDecimal(tx.fee);
  const txTax = toDecimal(tx.tax);
  const txTotalValue = toDecimal(tx.totalValue);

  if (tx.assetClass === 'STOCK') {
    const stock = getStockHolding(state.holdingsMap, tx.ticker);
    const lots = getLots(state.lotsMap, tx.ticker);

    if (tx.type === 'BUY') {
      const nextShares = stock.totalShares.plus(txQuantity);
      stock.grossBuyValueRemaining = stock.grossBuyValueRemaining.plus(txQuantity.times(txPrice));
      stock.allocatedBuyFeesRemaining = stock.allocatedBuyFeesRemaining.plus(txFee);
      stock.allocatedBuyTaxRemaining = stock.allocatedBuyTaxRemaining.plus(txTax);
      stock.totalShares = nextShares;
      
      const unitCostFee = txQuantity.gt(0) ? txFee.div(txQuantity) : DECIMAL_ZERO;
      const unitCostTax = txQuantity.gt(0) ? txTax.div(txQuantity) : DECIMAL_ZERO;
      
      lots.push({
        remainingQty: txQuantity,
        unitCostNet: txTotalValue.div(txQuantity),
        unitCostFee,
        unitCostTax
      });
      cash.totalShares = cash.totalShares.minus(txTotalValue);
      state.lastKnownPrices.set(tx.ticker, txPrice);
      return;
    }

    if (tx.type === 'SELL') {
      if (stock.totalShares.lt(txQuantity)) {
        state.calculationWarnings.push(`[Oversell] Sell quantity ${txQuantity.toNumber()} exceeds holdings ${stock.totalShares.toNumber()} for ${tx.ticker} on ${dateLabel}.`);
      }

      // Instead of clamping at 0, we now support negative shares (oversell)
      // but if we sell more than we have, we only deduct cost basis based on what we had.
      // If we are already negative, we have 0 cost basis.
      const quantityCostBasis = decimalMin(txQuantity, decimalMax(0, stock.totalShares));
      const ratioRemaining = stock.totalShares.gt(0) ? quantityCostBasis.div(stock.totalShares) : DECIMAL_ZERO;
      
      const grossCostBasisOfSold = stock.grossBuyValueRemaining.times(ratioRemaining);
      const feeBasisOfSold = stock.allocatedBuyFeesRemaining.times(ratioRemaining);
      const taxBasisOfSold = stock.allocatedBuyTaxRemaining.times(ratioRemaining);

      const averageCostBasisOfSoldShares = grossCostBasisOfSold.plus(feeBasisOfSold).plus(taxBasisOfSold);
      const averageCostNetProceeds = txPrice.times(txQuantity).minus(txFee).minus(txTax);
      
      stock.grossBuyValueRemaining = stock.grossBuyValueRemaining.minus(grossCostBasisOfSold);
      stock.allocatedBuyFeesRemaining = stock.allocatedBuyFeesRemaining.minus(feeBasisOfSold);
      stock.allocatedBuyTaxRemaining = stock.allocatedBuyTaxRemaining.minus(taxBasisOfSold);
      stock.totalShares = stock.totalShares.minus(txQuantity); // negative if oversell
      
      if (stock.totalShares.lte(0)) {
        stock.grossBuyValueRemaining = DECIMAL_ZERO;
        stock.allocatedBuyFeesRemaining = DECIMAL_ZERO;
        stock.allocatedBuyTaxRemaining = DECIMAL_ZERO;
      }

      // PnL only considers the portion we had cost basis for, or all proceeds if we are overselling?
      // For simplicity, realized PnL = Proceeds - Cost Basis
      stock.averageCostRealizedPnL = stock.averageCostRealizedPnL.plus(averageCostNetProceeds.minus(averageCostBasisOfSoldShares));

      let fifoCostBasis = DECIMAL_ZERO;
      let remainingQty = txQuantity;
      while (remainingQty.gt(0) && lots.length > 0) {
        const lot = lots[0];
        const consumed = decimalMin(remainingQty, lot.remainingQty);
        fifoCostBasis = fifoCostBasis.plus(consumed.times(lot.unitCostNet));
        lot.remainingQty = lot.remainingQty.minus(consumed);
        remainingQty = remainingQty.minus(consumed);
        if (lot.remainingQty.lte(0)) {
          lots.shift();
        }
      }

      const fifoNetProceeds = txPrice.times(txQuantity).minus(txFee).minus(txTax);
      stock.fifoRealizedPnL = stock.fifoRealizedPnL.plus(fifoNetProceeds.minus(fifoCostBasis));
      
      cash.totalShares = cash.totalShares.plus(fifoNetProceeds);
      state.lastKnownPrices.set(tx.ticker, txPrice);
      return;
    }

    if (tx.type === 'STOCK_DIVIDEND') {
      stock.totalShares = stock.totalShares.plus(txQuantity);
        lots.push({
          remainingQty: txQuantity,
          unitCostNet: DECIMAL_ZERO,
          unitCostFee: DECIMAL_ZERO,
          unitCostTax: DECIMAL_ZERO
      });
      return;
    }

    if (tx.type === 'DIVIDEND') {
      cash.totalShares = cash.totalShares.plus(txTotalValue);
      return;
    }
  }

  if (tx.type === 'DEPOSIT') {
    cash.totalShares = cash.totalShares.plus(txTotalValue);
    state.netContributions = state.netContributions.plus(txTotalValue);
    return;
  }

  if (tx.type === 'INTEREST') {
    cash.totalShares = cash.totalShares.plus(txTotalValue);
    return;
  }

  if (tx.type === 'WITHDRAW') {
    cash.totalShares = cash.totalShares.minus(txTotalValue);
    state.netContributions = state.netContributions.minus(txTotalValue);
  }
}

function buildHoldingsFromState(
  state: ReplayState,
  currentPrices: Record<string, number>,
  valuationMode: boolean,
  priceOverrides?: Map<string, Decimal>
): Holding[] {
  const holdings: Holding[] = [];

  for (const [ticker, holding] of state.holdingsMap.entries()) {
    const fallbackPrice = priceOverrides?.get(ticker) ?? state.lastKnownPrices.get(ticker);
    const costPrice = holding.totalShares.gt(0) ? holding.grossBuyValueRemaining.plus(holding.allocatedBuyFeesRemaining).plus(holding.allocatedBuyTaxRemaining).div(holding.totalShares) : DECIMAL_ZERO;
    const valuedShares = ticker === 'CASH_VND'
      ? holding.totalShares
      : decimalMax(holding.totalShares, DECIMAL_ZERO);
    
    let currentPriceDec = DECIMAL_ONE;
    
    if (ticker !== 'CASH_VND') {
      if (currentPrices[ticker] !== undefined) {
        currentPriceDec = toDecimal(currentPrices[ticker]);
      } else if (fallbackPrice !== undefined) {
        currentPriceDec = fallbackPrice;
      } else {
        currentPriceDec = costPrice;
      }
    }
      
    // Partial broker exports can create synthetic negative holdings from missing opening positions.
    // Keep the share count for diagnostics, but exclude negative lots from valuation.
    const marketValue = valuedShares.times(currentPriceDec);
    const netCostBasis = ticker === 'CASH_VND' ? marketValue : holding.grossBuyValueRemaining.plus(holding.allocatedBuyFeesRemaining).plus(holding.allocatedBuyTaxRemaining);
    const unrealizedPnL = ticker === 'CASH_VND' ? DECIMAL_ZERO : marketValue.minus(netCostBasis);

    if (
      !holding.totalShares.eq(0) ||
      !holding.averageCostRealizedPnL.eq(0) ||
      !holding.fifoRealizedPnL.eq(0)
    ) {
      const gAP = ticker === 'CASH_VND' ? DECIMAL_ONE : (holding.totalShares.gt(0) ? holding.grossBuyValueRemaining.div(holding.totalShares) : DECIMAL_ZERO);
      const nAC = ticker === 'CASH_VND' ? DECIMAL_ONE : (holding.totalShares.gt(0) ? netCostBasis.div(holding.totalShares) : DECIMAL_ZERO);
      
      holdings.push({
        assetClass: holding.assetClass,
        ticker: holding.ticker,
        totalShares: toQuantity(holding.totalShares),
        grossAveragePrice: toPrice(gAP),
        netAverageCost: toPrice(nAC),
        currentPrice: toPrice(currentPriceDec),
        marketValue: toMoney(marketValue),
        averageCostRealizedPnL: toMoney(holding.averageCostRealizedPnL),
        fifoRealizedPnL: toMoney(holding.fifoRealizedPnL),
        unrealizedPnL: toMoney(unrealizedPnL),
        unrealizedPnLPercent: !netCostBasis.eq(0) ? decimalToNumber(unrealizedPnL.div(netCostBasis)) : 0,
      });
    }
  }

  return holdings.sort((a, b) => {
    if (a.ticker === 'CASH_VND') return 1;
    if (b.ticker === 'CASH_VND') return -1;
    return b.marketValue - a.marketValue;
  });
}

function getCashContributionDelta(evt: CashLedgerEvent): Decimal {
  switch (evt.eventType) {
    case 'DEPOSIT':
      return toDecimal(evt.amount);
    case 'WITHDRAW':
    case 'BANK_TRANSFER_OUT':
      return toDecimal(evt.amount).negated();
    default:
      return DECIMAL_ZERO;
  }
}

function seedOpeningSnapshot(state: ReplayState, snapshot?: OpeningPositionSnapshot | null) {
  if (!snapshot?.positions?.length) return;

  snapshot.positions.forEach((position) => {
    const ticker = position.ticker.trim().toUpperCase();
    if (!ticker) return;

    const quantity = toDecimal(position.quantity);
    const averageCost = toDecimal(position.averageCost);
    if (quantity.lte(0) || averageCost.lt(0)) return;

    const stock = getStockHolding(state.holdingsMap, ticker);
    const lots = getLots(state.lotsMap, ticker);
    const grossValue = quantity.times(averageCost);

    stock.totalShares = stock.totalShares.plus(quantity);
    stock.grossBuyValueRemaining = stock.grossBuyValueRemaining.plus(grossValue);
    stock.allocatedBuyFeesRemaining = stock.allocatedBuyFeesRemaining.plus(DECIMAL_ZERO);
    stock.allocatedBuyTaxRemaining = stock.allocatedBuyTaxRemaining.plus(DECIMAL_ZERO);

    lots.push({
      remainingQty: quantity,
      unitCostNet: averageCost,
      unitCostFee: DECIMAL_ZERO,
      unitCostTax: DECIMAL_ZERO,
    });

    state.lastKnownPrices.set(ticker, averageCost);
  });
}

export function buildDailyNavSeries(
  transactions: Transaction[],
  currentPrices: Record<string, number>,
  cashEvents: CashLedgerEvent[],
  valuationDate?: Date | null,
  openingSnapshot?: OpeningPositionSnapshot | null
): NavPoint[] {
  const cutoffTime = openingSnapshot?.cutoffDate
    ? new Date(openingSnapshot.cutoffDate).setHours(0, 0, 0, 0)
    : null;
  const sortedTx = [...transactions]
    .filter((tx) => cutoffTime === null || new Date(tx.date).getTime() >= cutoffTime)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sortedCashEvents = [...cashEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const ledgerMode = sortedCashEvents.length > 0;

  if (sortedTx.length === 0 && sortedCashEvents.length === 0 && !openingSnapshot?.positions.length) return [];

  const state = createEmptyState();
  seedOpeningSnapshot(state, openingSnapshot);
  const navSeries: NavPoint[] = [];

  const firstDateTx = sortedTx.length > 0 ? new Date(sortedTx[0].date).getTime() : Infinity;
  const firstDateCash = sortedCashEvents.length > 0 ? new Date(sortedCashEvents[0].date).getTime() : Infinity;
  const firstOpeningDate = cutoffTime ?? Infinity;
  const startDate = new Date(Math.min(firstDateTx, firstDateCash, firstOpeningDate));
  const endDate = valuationDate ? new Date(valuationDate) : new Date();
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  let currentLedgerBalance = DECIMAL_ZERO;
  let currentNetContributionsLedger = DECIMAL_ZERO;

  let txIndex = 0;
  let cashIndex = 0;

  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    // Collect all events for the current day
    const dayTxs: Transaction[] = [];
    while (txIndex < sortedTx.length) {
      const txDate = new Date(sortedTx[txIndex].date);
      txDate.setHours(0, 0, 0, 0);
      if (txDate.getTime() > cursor.getTime()) break;
      dayTxs.push(sortedTx[txIndex]);
      txIndex += 1;
    }

    const dayCashEvents: CashLedgerEvent[] = [];
    while (cashIndex < sortedCashEvents.length) {
      const evtDate = new Date(sortedCashEvents[cashIndex].date);
      evtDate.setHours(0, 0, 0, 0);
      if (evtDate.getTime() > cursor.getTime()) break;
      dayCashEvents.push(sortedCashEvents[cashIndex]);
      cashIndex += 1;
    }

    // Mix snapshot application priority: Interest -> Deposit -> Transaction -> Withdraw -> others
    // For cash events, we update ledger balance directly sequentially
    dayCashEvents.forEach(evt => {
       currentLedgerBalance = toDecimal(evt.balanceAfter);
       currentNetContributionsLedger = currentNetContributionsLedger.plus(getCashContributionDelta(evt));
    });

    dayTxs.forEach(tx => applyTransaction(state, tx, ledgerMode));

    const dayKey = getDateKey(cursor);
    const dayPriceOverrides = new Map<string, Decimal>(state.lastKnownPrices);
    if (dayKey === getDateKey(new Date())) {
      Object.entries(currentPrices).forEach(([ticker, price]) => {
        dayPriceOverrides.set(ticker, toDecimal(price));
      });
    }

    const holdings = buildHoldingsFromState(state, currentPrices, false, dayPriceOverrides);
    let cashValue = 0;
    
    // Ledger vs. Derived reconciliation
    const derivedCash = decimalToNumber(state.holdingsMap.get('CASH_VND')?.totalShares ?? DECIMAL_ZERO);
    const ledgerCash = decimalToNumber(currentLedgerBalance);

    if (ledgerMode) {
      cashValue = ledgerCash;
      if (Math.abs(ledgerCash - derivedCash) > 100) { // 100 VND tolerence
         state.calculationWarnings.push(`[Reconciliation] Cash drift on ${dayKey}: Ledger(${ledgerCash}) vs Derived(${derivedCash})`);
      }
    } else {
      cashValue = holdings.find((holding) => holding.ticker === 'CASH_VND')?.marketValue ?? 0;
    }

    const investedMarketValue = decimalToNumber(decimalSum(
      holdings
        .filter((holding) => holding.ticker !== 'CASH_VND')
        .map((holding) => holding.marketValue)
    ));

    const netAssetValue = decimalToNumber(toDecimal(cashValue).plus(investedMarketValue));

    navSeries.push({
      date: dayKey,
      netAssetValue: toMoney(netAssetValue),
      cashValue: toMoney(cashValue),
      cashValueSource: ledgerMode ? 'ledger' : 'derived',
      investedMarketValue: toMoney(investedMarketValue),
      netContributions: ledgerMode ? toMoney(currentNetContributionsLedger) : toMoney(state.netContributions),
      reconciled: ledgerMode ? Math.abs(ledgerCash - derivedCash) <= 100 : true
    });
  }

  return navSeries;
}

export function calculatePortfolioMetrics(
  transactions: Transaction[],
  currentPrices: Record<string, number>,
  cashEvents: CashLedgerEvent[],
  valuationDate?: Date | null,
  openingSnapshot?: OpeningPositionSnapshot | null,
  feeDebtInput?: number
): PortfolioMetrics {
  const cutoffTime = openingSnapshot?.cutoffDate
    ? new Date(openingSnapshot.cutoffDate).setHours(0, 0, 0, 0)
    : null;
  let sortedTx = [...transactions]
    .filter((tx) => cutoffTime === null || new Date(tx.date).getTime() >= cutoffTime)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let sortedCashEvents = [...cashEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (valuationDate) {
    const vTime = new Date(valuationDate);
    vTime.setHours(23, 59, 59, 999);
    const limit = vTime.getTime();
    sortedTx = sortedTx.filter(tx => new Date(tx.date).getTime() <= limit);
    sortedCashEvents = sortedCashEvents.filter(evt => new Date(evt.date).getTime() <= limit);
  }

  const ledgerMode = sortedCashEvents.length > 0;
  const state = createEmptyState();
  seedOpeningSnapshot(state, openingSnapshot);

  sortedTx.forEach((tx) => applyTransaction(state, tx, ledgerMode));

  let finalLedgerBalance = DECIMAL_ZERO;
  let finalNetContributionsLedger = DECIMAL_ZERO;
  sortedCashEvents.forEach((evt) => {
    finalLedgerBalance = toDecimal(evt.balanceAfter);
    finalNetContributionsLedger = finalNetContributionsLedger.plus(getCashContributionDelta(evt));
  });

  const holdings = buildHoldingsFromState(state, currentPrices, !!valuationDate);
  
  if (ledgerMode) {
    const cashHolding = holdings.find(h => h.ticker === 'CASH_VND');
    const finalLedgerBalanceNum = decimalToNumber(finalLedgerBalance);
    if (cashHolding) {
      cashHolding.totalShares = toQuantity(finalLedgerBalanceNum);
      cashHolding.marketValue = toMoney(finalLedgerBalanceNum);
    } else {
      holdings.push({
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        totalShares: toQuantity(finalLedgerBalanceNum),
        grossAveragePrice: toPrice(1),
        netAverageCost: toPrice(1),
        currentPrice: toPrice(1),
        marketValue: toMoney(finalLedgerBalanceNum),
        averageCostRealizedPnL: toMoney(0),
        fifoRealizedPnL: toMoney(0),
        unrealizedPnL: toMoney(0),
        unrealizedPnLPercent: 0,
      });
    }
  }

  const totalMarketValueDec = decimalSum(holdings.map((holding) => holding.marketValue));
  const cashBalanceDec = toDecimal(holdings.find((holding) => holding.ticker === 'CASH_VND')?.marketValue ?? 0);
  const stockHoldings = holdings.filter((holding) => holding.ticker !== 'CASH_VND');
  const positiveStockHoldings = stockHoldings.filter((holding) => holding.totalShares > 0);
  const negativeStockHoldings = stockHoldings.filter((holding) => holding.totalShares < 0);
  const stockMarketValueDec = decimalSum(stockHoldings.map((holding) => holding.marketValue));
  const currentCostBasisDec = decimalSum(holdings.map((holding) => (
    holding.ticker === 'CASH_VND'
      ? DECIMAL_ZERO
      : toDecimal(decimalMax(holding.totalShares, DECIMAL_ZERO)).times(holding.netAverageCost)
  )));
  const averageCostRealizedPnLDec = decimalSum(holdings.map((holding) => holding.averageCostRealizedPnL));
  const fifoRealizedPnLDec = decimalSum(holdings.map((holding) => holding.fifoRealizedPnL));
  const totalUnrealizedPnLDec = decimalSum(holdings.map((holding) => holding.unrealizedPnL));
  const netPnLDec = totalUnrealizedPnLDec.plus(averageCostRealizedPnLDec);
  const activeNetContributionsDec = ledgerMode ? finalNetContributionsLedger : state.netContributions;
  const feeDebtDec = decimalMax(toDecimal(feeDebtInput ?? 0), DECIMAL_ZERO);
  const netNavDec = totalMarketValueDec.minus(feeDebtDec);
  const finalDerivedCashDec = state.holdingsMap.get('CASH_VND')?.totalShares ?? DECIMAL_ZERO;
  const cashDriftDec = ledgerMode ? finalLedgerBalance.minus(finalDerivedCashDec).abs() : DECIMAL_ZERO;
  const livePriceCoverageCount = positiveStockHoldings.filter((holding) => currentPrices[holding.ticker] !== undefined).length;
  const fallbackPriceCount = positiveStockHoldings.length - livePriceCoverageCount;
  const reconciliationInsights: ReconciliationInsight[] = [];

  if (negativeStockHoldings.length > 0) {
    reconciliationInsights.push({
      code: 'negative-holdings',
      level: 'warning',
      message: `Detected ${negativeStockHoldings.length} negative holding(s). Missing opening positions before the cut-off date will distort cost basis and realized P&L.`,
    });
  }

  if (ledgerMode && cashDriftDec.gt(100)) {
    reconciliationInsights.push({
      code: 'cash-drift',
      level: 'warning',
      message: `Cash ledger and replayed trade cash differ by ${decimalToNumber(cashDriftDec).toLocaleString('vi-VN')} VND. Review uncaptured cash events or trade coverage gaps.`,
    });
  }

  if (feeDebtDec.gt(0)) {
    reconciliationInsights.push({
      code: 'fee-debt',
      level: 'info',
      message: `NAV is currently reduced by manual fee debt of ${decimalToNumber(feeDebtDec).toLocaleString('vi-VN')} VND.`,
    });
  }

  if (fallbackPriceCount > 0) {
    reconciliationInsights.push({
      code: 'fallback-prices',
      level: 'warning',
      message: `${fallbackPriceCount} holding(s) are still valued from fallback prices instead of the live quote feed.`,
    });
  } else if (positiveStockHoldings.length > 0) {
    reconciliationInsights.push({
      code: 'live-prices',
      level: 'info',
      message: `All ${positiveStockHoldings.length} active stock holding(s) are using live quote overrides from the client feed.`,
    });
  }

  if ((openingSnapshot?.positions.length ?? 0) > 0) {
    reconciliationInsights.push({
      code: 'opening-snapshot',
      level: 'info',
      message: `Opening snapshot is active with ${(openingSnapshot?.positions.length ?? 0).toLocaleString('vi-VN')} position(s) from the selected cut-off date.`,
    });
  }

  // Final reconciliation check
  if (ledgerMode) {
     const finalDerivedCash = decimalToNumber(finalDerivedCashDec);
     if (Math.abs(decimalToNumber(finalLedgerBalance) - finalDerivedCash) > 100) {
       state.calculationWarnings.push(`[Reconciliation] Final cash drift: Ledger(${decimalToNumber(finalLedgerBalance)}) vs Derived(${finalDerivedCash})`);
     }
  }

  return {
    holdings,
    totalMarketValue: toMoney(totalMarketValueDec.minus(feeDebtDec)),
    feeDebt: toMoney(feeDebtDec),
    currentCostBasis: toMoney(currentCostBasisDec),
    averageCostRealizedPnL: toMoney(averageCostRealizedPnLDec),
    fifoRealizedPnL: toMoney(fifoRealizedPnLDec),
    totalUnrealizedPnL: toMoney(totalUnrealizedPnLDec),
    netContributions: toMoney(activeNetContributionsDec),
    returnVsCostBasis: activeNetContributionsDec.eq(0) ? 0 : decimalToNumber(netPnLDec.div(activeNetContributionsDec)),
    navSeries: buildDailyNavSeries(sortedTx, currentPrices, sortedCashEvents, valuationDate, openingSnapshot),
    calculationWarnings: state.calculationWarnings,
    cashBalanceSource: ledgerMode ? 'ledger' : 'derived',
    cashBalanceEOD: ledgerMode ? toMoney(finalLedgerBalance) : undefined,
    cashLedgerCoverageStart: ledgerMode && sortedCashEvents.length > 0 ? sortedCashEvents[0].date.toISOString() : undefined,
    cashLedgerCoverageEnd: ledgerMode && sortedCashEvents.length > 0 ? sortedCashEvents[sortedCashEvents.length - 1].date.toISOString() : undefined,
    reconciliation: {
      cashBalance: toMoney(cashBalanceDec),
      stockMarketValue: toMoney(stockMarketValueDec),
      grossNavBeforeDebt: toMoney(totalMarketValueDec),
      feeDebt: toMoney(feeDebtDec),
      netNav: toMoney(netNavDec),
      currentCostBasis: toMoney(currentCostBasisDec),
      totalUnrealizedPnL: toMoney(totalUnrealizedPnLDec),
      averageCostRealizedPnL: toMoney(averageCostRealizedPnLDec),
      fifoRealizedPnL: toMoney(fifoRealizedPnLDec),
      positiveStockCount: positiveStockHoldings.length,
      negativeStockCount: negativeStockHoldings.length,
      openingPositionCount: openingSnapshot?.positions.length ?? 0,
      livePriceCoverageCount,
      fallbackPriceCount,
      derivedCashBalance: ledgerMode ? toMoney(finalDerivedCashDec) : undefined,
      cashDrift: ledgerMode ? toMoney(cashDriftDec) : undefined,
      insights: reconciliationInsights,
    },
  };
}

export function groupTransactionsByDay(transactions: Transaction[]): GroupedTransactionsByDay[] {
  const grouped = new Map<string, Transaction[]>();

  [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((transaction) => {
      const dateKey = getDateKey(transaction.date);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(transaction);
    });

  return Array.from(grouped.entries()).map(([dateKey, items]) => ({
    dateKey,
    displayDate: formatDisplayDate(dateKey),
    items,
    count: items.length,
    dayGrossValue: toMoney(decimalSum(items.map((item) => toDecimal(item.quantity).times(item.price)))),
  }));
}
