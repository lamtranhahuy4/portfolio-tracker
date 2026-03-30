import Decimal from 'decimal.js';
import { DECIMAL_ONE, DECIMAL_ZERO, decimalMax, decimalMin, decimalSum, decimalToNumber, toDecimal } from '@/domain/portfolio/decimal';
import { CashLedgerEvent, GroupedTransactionsByDay, Holding, NavPoint, PortfolioMetrics, Transaction } from '@/types/portfolio';

type HoldingState = {
  assetClass: Holding['assetClass'];
  ticker: string;
  totalShares: Decimal;
  grossBuyValueRemaining: Decimal;
  allocatedBuyFeesRemaining: Decimal;
  averageCostRealizedPnL: Decimal;
  fifoRealizedPnL: Decimal;
};

type Lot = {
  remainingQty: Decimal;
  unitCostNet: Decimal;
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
      stock.allocatedBuyFeesRemaining = stock.allocatedBuyFeesRemaining.plus(txFee).plus(txTax);
      stock.totalShares = nextShares;
      lots.push({
        remainingQty: txQuantity,
        unitCostNet: txTotalValue.div(txQuantity),
      });
      if (!ledgerMode) cash.totalShares = cash.totalShares.minus(txTotalValue);
      state.lastKnownPrices.set(tx.ticker, txPrice);
      return;
    }

    if (tx.type === 'SELL') {
      if (stock.totalShares.lt(txQuantity)) {
        state.calculationWarnings.push(`Sell quantity exceeds holdings for ${tx.ticker} on ${dateLabel}.`);
      }

      const quantityToSell = decimalMin(txQuantity, stock.totalShares);
      const ratioRemaining = stock.totalShares.gt(0) ? quantityToSell.div(stock.totalShares) : DECIMAL_ZERO;
      
      const grossCostBasisOfSold = stock.grossBuyValueRemaining.times(ratioRemaining);
      const feeBasisOfSold = stock.allocatedBuyFeesRemaining.times(ratioRemaining);

      const averageCostBasisOfSoldShares = grossCostBasisOfSold.plus(feeBasisOfSold);
      const averageCostNetProceeds = txPrice.times(quantityToSell).minus(txFee).minus(txTax);
      
      stock.grossBuyValueRemaining = stock.grossBuyValueRemaining.minus(grossCostBasisOfSold);
      stock.allocatedBuyFeesRemaining = stock.allocatedBuyFeesRemaining.minus(feeBasisOfSold);
      stock.totalShares = decimalMax(0, stock.totalShares.minus(quantityToSell));
      
      if (stock.totalShares.eq(0)) {
        stock.grossBuyValueRemaining = DECIMAL_ZERO;
        stock.allocatedBuyFeesRemaining = DECIMAL_ZERO;
      }

      stock.averageCostRealizedPnL = stock.averageCostRealizedPnL.plus(averageCostNetProceeds.minus(averageCostBasisOfSoldShares));

      let fifoCostBasis = DECIMAL_ZERO;
      let remainingQty = quantityToSell;
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

      if (remainingQty.gt(0)) {
        state.calculationWarnings.push(`FIFO lots exhausted for ${tx.ticker} on ${dateLabel}.`);
      }

      const fifoNetProceeds = txPrice.times(quantityToSell).minus(txFee).minus(txTax);
      stock.fifoRealizedPnL = stock.fifoRealizedPnL.plus(fifoNetProceeds.minus(fifoCostBasis));
      
      if (!ledgerMode) cash.totalShares = cash.totalShares.plus(fifoNetProceeds);
      state.lastKnownPrices.set(tx.ticker, txPrice);
      return;
    }

    if (tx.type === 'STOCK_DIVIDEND') {
      stock.totalShares = stock.totalShares.plus(txQuantity);
        lots.push({
          remainingQty: txQuantity,
          unitCostNet: DECIMAL_ZERO,
      });
      return;
    }

    if (tx.type === 'DIVIDEND') {
      if (!ledgerMode) cash.totalShares = cash.totalShares.plus(txTotalValue);
      return;
    }
  }

  if (tx.type === 'DEPOSIT') {
    if (!ledgerMode) {
      cash.totalShares = cash.totalShares.plus(txTotalValue);
      state.netContributions = state.netContributions.plus(txTotalValue);
    }
    return;
  }

  if (tx.type === 'INTEREST') {
    if (!ledgerMode) cash.totalShares = cash.totalShares.plus(txTotalValue);
    return;
  }

  if (tx.type === 'WITHDRAW') {
    if (!ledgerMode) {
      cash.totalShares = cash.totalShares.minus(txTotalValue);
      state.netContributions = state.netContributions.minus(txTotalValue);
    }
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
    const costPrice = holding.totalShares.gt(0) ? holding.grossBuyValueRemaining.plus(holding.allocatedBuyFeesRemaining).div(holding.totalShares) : DECIMAL_ZERO;
    
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
      
    const marketValue = holding.totalShares.times(currentPriceDec);
    const netCostBasis = ticker === 'CASH_VND' ? marketValue : holding.grossBuyValueRemaining.plus(holding.allocatedBuyFeesRemaining);
    const unrealizedPnL = ticker === 'CASH_VND' ? DECIMAL_ZERO : marketValue.minus(netCostBasis);

    if (
      holding.totalShares.gt(0) ||
      !holding.averageCostRealizedPnL.eq(0) ||
      !holding.fifoRealizedPnL.eq(0)
    ) {
      const gAP = ticker === 'CASH_VND' ? DECIMAL_ONE : (holding.totalShares.gt(0) ? holding.grossBuyValueRemaining.div(holding.totalShares) : DECIMAL_ZERO);
      const nAC = ticker === 'CASH_VND' ? DECIMAL_ONE : (holding.totalShares.gt(0) ? netCostBasis.div(holding.totalShares) : DECIMAL_ZERO);
      
      holdings.push({
        assetClass: holding.assetClass,
        ticker: holding.ticker,
        totalShares: decimalToNumber(holding.totalShares),
        grossAveragePrice: decimalToNumber(gAP),
        netAverageCost: decimalToNumber(nAC),
        currentPrice: decimalToNumber(currentPriceDec),
        marketValue: decimalToNumber(marketValue),
        averageCostRealizedPnL: decimalToNumber(holding.averageCostRealizedPnL),
        fifoRealizedPnL: decimalToNumber(holding.fifoRealizedPnL),
        unrealizedPnL: decimalToNumber(unrealizedPnL),
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

export function buildDailyNavSeries(
  transactions: Transaction[],
  currentPrices: Record<string, number>,
  cashEvents: CashLedgerEvent[],
  valuationDate?: Date | null
): NavPoint[] {
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sortedCashEvents = [...cashEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const ledgerMode = sortedCashEvents.length > 0;

  if (sortedTx.length === 0 && sortedCashEvents.length === 0) return [];

  const state = createEmptyState();
  const navSeries: NavPoint[] = [];
  let txIndex = 0;
  let cashIndex = 0;

  const firstDateTx = sortedTx.length > 0 ? new Date(sortedTx[0].date).getTime() : Infinity;
  const firstDateCash = sortedCashEvents.length > 0 ? new Date(sortedCashEvents[0].date).getTime() : Infinity;
  const startDate = new Date(Math.min(firstDateTx, firstDateCash));
  const endDate = valuationDate ? new Date(valuationDate) : new Date();
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  let currentLedgerBalance = DECIMAL_ZERO;
  let currentNetContributionsLedger = DECIMAL_ZERO;

  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    while (txIndex < sortedTx.length) {
      const txDate = new Date(sortedTx[txIndex].date);
      txDate.setHours(0, 0, 0, 0);
      if (txDate.getTime() > cursor.getTime()) break;
      applyTransaction(state, sortedTx[txIndex], ledgerMode);
      txIndex += 1;
    }

    while (cashIndex < sortedCashEvents.length) {
      const evt = sortedCashEvents[cashIndex];
      const evtDate = new Date(evt.date);
      evtDate.setHours(0, 0, 0, 0);
      if (evtDate.getTime() > cursor.getTime()) break;
      
      currentLedgerBalance = toDecimal(evt.balanceAfter);
      currentNetContributionsLedger = currentNetContributionsLedger.plus(getCashContributionDelta(evt));
      
      cashIndex += 1;
    }

    const dayKey = getDateKey(cursor);
    const dayPriceOverrides = new Map<string, Decimal>(state.lastKnownPrices);
    if (dayKey === getDateKey(new Date())) {
      Object.entries(currentPrices).forEach(([ticker, price]) => {
        dayPriceOverrides.set(ticker, toDecimal(price));
      });
    }

    const holdings = buildHoldingsFromState(state, currentPrices, false, dayPriceOverrides);
    let cashValue = 0;
    
    if (ledgerMode) {
      cashValue = decimalToNumber(currentLedgerBalance);
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
      netAssetValue,
      cashValue,
      cashValueSource: ledgerMode ? 'ledger' : 'derived',
      investedMarketValue,
      netContributions: ledgerMode ? decimalToNumber(currentNetContributionsLedger) : decimalToNumber(state.netContributions),
    });
  }

  return navSeries;
}

export function calculatePortfolioMetrics(
  transactions: Transaction[],
  currentPrices: Record<string, number>,
  cashEvents: CashLedgerEvent[],
  valuationDate?: Date | null
): PortfolioMetrics {
  let sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
      cashHolding.totalShares = finalLedgerBalanceNum;
      cashHolding.marketValue = finalLedgerBalanceNum;
    } else {
      holdings.push({
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        totalShares: finalLedgerBalanceNum,
        grossAveragePrice: 1,
        netAverageCost: 1,
        currentPrice: 1,
        marketValue: finalLedgerBalanceNum,
        averageCostRealizedPnL: 0,
        fifoRealizedPnL: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
    }
  }

  const totalMarketValueDec = decimalSum(holdings.map((holding) => holding.marketValue));
  const currentCostBasisDec = decimalSum(holdings.map((holding) => (
    holding.ticker === 'CASH_VND'
      ? holding.marketValue
      : toDecimal(holding.totalShares).times(holding.netAverageCost)
  )));
  const averageCostRealizedPnLDec = decimalSum(holdings.map((holding) => holding.averageCostRealizedPnL));
  const fifoRealizedPnLDec = decimalSum(holdings.map((holding) => holding.fifoRealizedPnL));
  const totalUnrealizedPnLDec = decimalSum(holdings.map((holding) => holding.unrealizedPnL));
  const netPnLDec = totalUnrealizedPnLDec.plus(averageCostRealizedPnLDec);
  const activeNetContributionsDec = ledgerMode ? finalNetContributionsLedger : state.netContributions;

  return {
    holdings,
    totalMarketValue: decimalToNumber(totalMarketValueDec),
    currentCostBasis: decimalToNumber(currentCostBasisDec),
    averageCostRealizedPnL: decimalToNumber(averageCostRealizedPnLDec),
    fifoRealizedPnL: decimalToNumber(fifoRealizedPnLDec),
    totalUnrealizedPnL: decimalToNumber(totalUnrealizedPnLDec),
    netContributions: decimalToNumber(activeNetContributionsDec),
    returnVsCostBasis: activeNetContributionsDec.eq(0) ? 0 : decimalToNumber(netPnLDec.div(activeNetContributionsDec)),
    navSeries: buildDailyNavSeries(sortedTx, currentPrices, sortedCashEvents, valuationDate),
    calculationWarnings: state.calculationWarnings,
    cashBalanceSource: ledgerMode ? 'ledger' : 'derived',
    cashBalanceEOD: ledgerMode ? decimalToNumber(finalLedgerBalance) : undefined,
    cashLedgerCoverageStart: ledgerMode && sortedCashEvents.length > 0 ? sortedCashEvents[0].date.toISOString() : undefined,
    cashLedgerCoverageEnd: ledgerMode && sortedCashEvents.length > 0 ? sortedCashEvents[sortedCashEvents.length - 1].date.toISOString() : undefined,
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
    dayGrossValue: decimalToNumber(decimalSum(items.map((item) => toDecimal(item.quantity).times(item.price)))),
  }));
}
