import Decimal from 'decimal.js';
import { DECIMAL_ONE, DECIMAL_ZERO, decimalMax, decimalMin, decimalSum, decimalToNumber, toDecimal, DecimalInput } from './decimal';
import { CashLedgerEvent, GroupedTransactionsByDay, Holding, NavPoint, OpeningPositionSnapshot, PortfolioMetrics, ReconciliationInsight, Transaction } from '@/types/portfolio';
import { CASH_DRIFT_THRESHOLD_VND } from '@/lib/constants';
import { toMoney, toQuantity, toPrice } from './primitives';
import { HoldingState, Lot, ReplayState } from './entities/ReplayEntities';


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
      let actualSellQuantity = txQuantity;

      if (stock.totalShares.lt(txQuantity)) {
        state.calculationWarnings.push(`[Oversell] Sell quantity ${txQuantity.toNumber()} exceeds holdings ${stock.totalShares.toNumber()} for ${tx.ticker} on ${dateLabel}.`);
        actualSellQuantity = decimalMax(DECIMAL_ZERO, stock.totalShares);
      }

      if (actualSellQuantity.lte(DECIMAL_ZERO)) {
        return; // Nothing to sell, avoid doing math on 0 shares
      }

      const sellRatio = actualSellQuantity.div(txQuantity);
      const actualFee = txFee.times(sellRatio);
      const actualTax = txTax.times(sellRatio);

      const ratioRemaining = stock.totalShares.gt(0) ? actualSellQuantity.div(stock.totalShares) : DECIMAL_ZERO;
      
      const grossCostBasisOfSold = stock.grossBuyValueRemaining.times(ratioRemaining);
      const feeBasisOfSold = stock.allocatedBuyFeesRemaining.times(ratioRemaining);
      const taxBasisOfSold = stock.allocatedBuyTaxRemaining.times(ratioRemaining);

      const averageCostBasisOfSoldShares = grossCostBasisOfSold.plus(feeBasisOfSold).plus(taxBasisOfSold);
      const averageCostNetProceeds = txPrice.times(actualSellQuantity).minus(actualFee).minus(actualTax);
      
      stock.grossBuyValueRemaining = stock.grossBuyValueRemaining.minus(grossCostBasisOfSold);
      stock.allocatedBuyFeesRemaining = stock.allocatedBuyFeesRemaining.minus(feeBasisOfSold);
      stock.allocatedBuyTaxRemaining = stock.allocatedBuyTaxRemaining.minus(taxBasisOfSold);
      stock.totalShares = decimalMax(DECIMAL_ZERO, stock.totalShares.minus(actualSellQuantity));
      
      if (stock.totalShares.lte(DECIMAL_ZERO)) {
        stock.grossBuyValueRemaining = DECIMAL_ZERO;
        stock.allocatedBuyFeesRemaining = DECIMAL_ZERO;
        stock.allocatedBuyTaxRemaining = DECIMAL_ZERO;
      }

      stock.averageCostRealizedPnL = stock.averageCostRealizedPnL.plus(averageCostNetProceeds.minus(averageCostBasisOfSoldShares));

      let fifoCostBasis = DECIMAL_ZERO;
      let remainingQtyToClear = actualSellQuantity;

      while (remainingQtyToClear.gt(0) && lots.length > 0) {
        const lot = lots[0];
        const consumed = decimalMin(remainingQtyToClear, lot.remainingQty);
        
        const lotTotalCost = consumed.times(lot.unitCostNet)
          .plus(consumed.times(lot.unitCostFee))
          .plus(consumed.times(lot.unitCostTax));
        
        fifoCostBasis = fifoCostBasis.plus(lotTotalCost);
        
        lot.remainingQty = lot.remainingQty.minus(consumed);
        remainingQtyToClear = remainingQtyToClear.minus(consumed);
        if (lot.remainingQty.lte(0)) {
          lots.shift();
        }
      }

      const fifoNetProceeds = txPrice.times(actualSellQuantity).minus(actualFee).minus(actualTax);
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
      
    const marketValue = valuedShares.times(currentPriceDec);
    const netCostBasis = ticker === 'CASH_VND' ? marketValue : holding.grossBuyValueRemaining.plus(holding.allocatedBuyFeesRemaining).plus(holding.allocatedBuyTaxRemaining);
    const unrealizedPnL = ticker === 'CASH_VND' ? DECIMAL_ZERO : marketValue.minus(netCostBasis);

    if (
      !holding.totalShares.eq(0) ||
      !holding.averageCostRealizedPnL.eq(0) ||
      !holding.fifoRealizedPnL.eq(0)
    ) {
      const shares = holding.totalShares;
      const gCP = ticker === 'CASH_VND' ? DECIMAL_ONE : (shares.gt(0) ? holding.grossBuyValueRemaining.div(shares) : DECIMAL_ZERO);
      const fCP = ticker === 'CASH_VND' ? DECIMAL_ZERO : (shares.gt(0) ? holding.allocatedBuyFeesRemaining.div(shares) : DECIMAL_ZERO);
      const tCP = ticker === 'CASH_VND' ? DECIMAL_ZERO : (shares.gt(0) ? holding.allocatedBuyTaxRemaining.div(shares) : DECIMAL_ZERO);
      const nAC = ticker === 'CASH_VND' ? DECIMAL_ONE : gCP.plus(fCP).plus(tCP);
      
      holdings.push({
        assetClass: holding.assetClass,
        ticker: holding.ticker,
        totalShares: toQuantity(holding.totalShares),
        grossAveragePrice: toPrice(gCP),
        grossCostPrice: toPrice(gCP),
        feeCostPrice: toPrice(fCP),
        taxCostPrice: toPrice(tCP),
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
  if (snapshot?.settings) {
    const cash = getCashHolding(state.holdingsMap);
    cash.totalShares = cash.totalShares.plus(toDecimal(snapshot.settings.initialCashBalance));
    state.netContributions = state.netContributions.plus(toDecimal(snapshot.settings.initialNetContributions));
  }

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
  openingSnapshot?: OpeningPositionSnapshot | null,
  historicalPrices?: Record<string, Record<string, number>>
): NavPoint[] {
  const cutoffTime = openingSnapshot?.settings?.globalCutoffDate
    ? new Date(openingSnapshot.settings.globalCutoffDate).setHours(0, 0, 0, 0)
    : null;
  const sortedTx = [...transactions]
    .filter((tx) => cutoffTime === null || new Date(tx.date).getTime() >= cutoffTime)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sortedCashEvents = [...cashEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const ledgerMode = sortedCashEvents.length > 0;

  if (sortedTx.length === 0 && sortedCashEvents.length === 0 && !openingSnapshot?.positions?.length && !openingSnapshot?.settings) return [];

  const state = createEmptyState();
  seedOpeningSnapshot(state, openingSnapshot);
  const navSeries: NavPoint[] = [];

  const firstDateTx = sortedTx.length > 0 ? new Date(sortedTx[0].date).getTime() : Infinity;
  const firstDateCash = sortedCashEvents.length > 0 ? new Date(sortedCashEvents[0].date).getTime() : Infinity;
  const firstOpeningDate = cutoffTime ?? Infinity;
  const startDate = new Date(Math.min(firstDateTx, firstDateCash, firstOpeningDate));
  const endDate = valuationDate ? new Date(valuationDate) : new Date();
  
  if (startDate.getTime() === Infinity) return [];
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  let currentLedgerBalance = openingSnapshot?.settings?.initialCashBalance ? toDecimal(openingSnapshot.settings.initialCashBalance) : DECIMAL_ZERO;
  let currentNetContributionsLedger = openingSnapshot?.settings?.initialNetContributions ? toDecimal(openingSnapshot.settings.initialNetContributions) : DECIMAL_ZERO;

  let txIndex = 0;
  let cashIndex = 0;

  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
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
    } else if (historicalPrices) {
      Object.entries(historicalPrices).forEach(([ticker, datePrices]) => {
        if (datePrices[dayKey]) {
          dayPriceOverrides.set(ticker, toDecimal(datePrices[dayKey]));
        }
      });
    }

    const holdings = buildHoldingsFromState(state, currentPrices, false, dayPriceOverrides);
    let cashValue = 0;
    
    const derivedCash = decimalToNumber(state.holdingsMap.get('CASH_VND')?.totalShares ?? DECIMAL_ZERO);
    const ledgerCash = decimalToNumber(currentLedgerBalance);

    if (ledgerMode) {
      cashValue = ledgerCash;
      if (Math.abs(ledgerCash - derivedCash) > 100) {
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
  feeDebtInput?: number,
  historicalPrices?: Record<string, Record<string, number>>
): PortfolioMetrics {
  const cutoffTime = openingSnapshot?.settings?.globalCutoffDate
    ? new Date(openingSnapshot.settings.globalCutoffDate).setHours(0, 0, 0, 0)
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

  let finalLedgerBalance = openingSnapshot?.settings?.initialCashBalance ? toDecimal(openingSnapshot.settings.initialCashBalance) : DECIMAL_ZERO;
  let finalNetContributionsLedger = openingSnapshot?.settings?.initialNetContributions ? toDecimal(openingSnapshot.settings.initialNetContributions) : DECIMAL_ZERO;
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
        grossCostPrice: toPrice(1),
        feeCostPrice: toPrice(0),
        taxCostPrice: toPrice(0),
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

  if (ledgerMode && cashDriftDec.gt(CASH_DRIFT_THRESHOLD_VND)) {
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

  if (ledgerMode) {
     const finalDerivedCash = decimalToNumber(finalDerivedCashDec);
     if (Math.abs(decimalToNumber(finalLedgerBalance) - finalDerivedCash) > CASH_DRIFT_THRESHOLD_VND) {
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
    returnOnInvestmentPercent: activeNetContributionsDec.eq(0) ? 0 : decimalToNumber(netNavDec.div(activeNetContributionsDec).minus(DECIMAL_ONE)),
    navSeries: buildDailyNavSeries(sortedTx, currentPrices, sortedCashEvents, valuationDate, openingSnapshot, historicalPrices),
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
