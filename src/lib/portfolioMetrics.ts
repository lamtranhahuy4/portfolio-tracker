import { Decimal } from 'decimal.js';
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
    netContributions: new Decimal(0),
    calculationWarnings: [],
  };
}

function getCashHolding(holdingsMap: Map<string, HoldingState>): HoldingState {
  if (!holdingsMap.has('CASH_VND')) {
    holdingsMap.set('CASH_VND', {
      assetClass: 'CASH',
      ticker: 'CASH_VND',
      totalShares: new Decimal(0),
      grossBuyValueRemaining: new Decimal(0),
      allocatedBuyFeesRemaining: new Decimal(0),
      averageCostRealizedPnL: new Decimal(0),
      fifoRealizedPnL: new Decimal(0),
    });
  }
  return holdingsMap.get('CASH_VND')!;
}

function getStockHolding(holdingsMap: Map<string, HoldingState>, ticker: string): HoldingState {
  if (!holdingsMap.has(ticker)) {
    holdingsMap.set(ticker, {
      assetClass: 'STOCK',
      ticker,
      totalShares: new Decimal(0),
      grossBuyValueRemaining: new Decimal(0),
      allocatedBuyFeesRemaining: new Decimal(0),
      averageCostRealizedPnL: new Decimal(0),
      fifoRealizedPnL: new Decimal(0),
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

  const txQuantity = new Decimal(tx.quantity);
  const txPrice = new Decimal(tx.price);
  const txFee = new Decimal(tx.fee);
  const txTax = new Decimal(tx.tax);
  const txTotalValue = new Decimal(tx.totalValue);

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

      const quantityToSell = Decimal.min(txQuantity, stock.totalShares);
      const ratioRemaining = stock.totalShares.gt(0) ? quantityToSell.div(stock.totalShares) : new Decimal(0);
      
      const grossCostBasisOfSold = stock.grossBuyValueRemaining.times(ratioRemaining);
      const feeBasisOfSold = stock.allocatedBuyFeesRemaining.times(ratioRemaining);

      const averageCostBasisOfSoldShares = grossCostBasisOfSold.plus(feeBasisOfSold);
      const averageCostNetProceeds = txPrice.times(quantityToSell).minus(txFee).minus(txTax);
      
      stock.grossBuyValueRemaining = stock.grossBuyValueRemaining.minus(grossCostBasisOfSold);
      stock.allocatedBuyFeesRemaining = stock.allocatedBuyFeesRemaining.minus(feeBasisOfSold);
      stock.totalShares = Decimal.max(0, stock.totalShares.minus(quantityToSell));
      
      if (stock.totalShares.eq(0)) {
        stock.grossBuyValueRemaining = new Decimal(0);
        stock.allocatedBuyFeesRemaining = new Decimal(0);
      }

      stock.averageCostRealizedPnL = stock.averageCostRealizedPnL.plus(averageCostNetProceeds.minus(averageCostBasisOfSoldShares));

      let fifoCostBasis = new Decimal(0);
      let remainingQty = quantityToSell;
      while (remainingQty.gt(0) && lots.length > 0) {
        const lot = lots[0];
        const consumed = Decimal.min(remainingQty, lot.remainingQty);
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
        unitCostNet: new Decimal(0),
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
    const costPrice = holding.totalShares.gt(0) ? holding.grossBuyValueRemaining.plus(holding.allocatedBuyFeesRemaining).div(holding.totalShares) : new Decimal(0);
    
    let currentPriceDec = new Decimal(1);
    
    if (ticker !== 'CASH_VND') {
      if (currentPrices[ticker] !== undefined) {
        currentPriceDec = new Decimal(currentPrices[ticker]);
      } else if (fallbackPrice !== undefined) {
        currentPriceDec = fallbackPrice;
      } else {
        currentPriceDec = costPrice;
      }
    }
      
    const marketValue = holding.totalShares.times(currentPriceDec);
    const netCostBasis = ticker === 'CASH_VND' ? marketValue : holding.grossBuyValueRemaining.plus(holding.allocatedBuyFeesRemaining);
    const unrealizedPnL = ticker === 'CASH_VND' ? new Decimal(0) : marketValue.minus(netCostBasis);

    if (
      holding.totalShares.gt(0) ||
      !holding.averageCostRealizedPnL.eq(0) ||
      !holding.fifoRealizedPnL.eq(0)
    ) {
      const gAP = ticker === 'CASH_VND' ? new Decimal(1) : (holding.totalShares.gt(0) ? holding.grossBuyValueRemaining.div(holding.totalShares) : new Decimal(0));
      const nAC = ticker === 'CASH_VND' ? new Decimal(1) : (holding.totalShares.gt(0) ? netCostBasis.div(holding.totalShares) : new Decimal(0));
      
      holdings.push({
        assetClass: holding.assetClass,
        ticker: holding.ticker,
        totalShares: holding.totalShares.toNumber(),
        grossAveragePrice: gAP.toNumber(),
        netAverageCost: nAC.toNumber(),
        currentPrice: currentPriceDec.toNumber(),
        marketValue: marketValue.toNumber(),
        averageCostRealizedPnL: holding.averageCostRealizedPnL.toNumber(),
        fifoRealizedPnL: holding.fifoRealizedPnL.toNumber(),
        unrealizedPnL: unrealizedPnL.toNumber(),
        unrealizedPnLPercent: !netCostBasis.eq(0) ? unrealizedPnL.div(netCostBasis).toNumber() : 0,
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
      return new Decimal(evt.amount);
    case 'WITHDRAW':
    case 'BANK_TRANSFER_OUT':
      return new Decimal(evt.amount).negated();
    default:
      return new Decimal(0);
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
  
  let currentLedgerBalance = new Decimal(0);
  let currentNetContributionsLedger = new Decimal(0);

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
      
      currentLedgerBalance = new Decimal(evt.balanceAfter);
      currentNetContributionsLedger = currentNetContributionsLedger.plus(getCashContributionDelta(evt));
      
      cashIndex += 1;
    }

    const dayKey = getDateKey(cursor);
    const dayPriceOverrides = new Map<string, Decimal>(state.lastKnownPrices);
    if (dayKey === getDateKey(new Date())) {
      Object.entries(currentPrices).forEach(([ticker, price]) => {
        dayPriceOverrides.set(ticker, new Decimal(price));
      });
    }

    const holdings = buildHoldingsFromState(state, currentPrices, false, dayPriceOverrides);
    let cashValue = 0;
    
    if (ledgerMode) {
      cashValue = currentLedgerBalance.toNumber();
    } else {
      cashValue = holdings.find((holding) => holding.ticker === 'CASH_VND')?.marketValue ?? 0;
    }

    const investedMarketValue = holdings
      .filter((holding) => holding.ticker !== 'CASH_VND')
      .reduce((sum, holding) => sum + holding.marketValue, 0);

    navSeries.push({
      date: dayKey,
      netAssetValue: cashValue + investedMarketValue,
      cashValue,
      cashValueSource: ledgerMode ? 'ledger' : 'derived',
      investedMarketValue,
      netContributions: ledgerMode ? currentNetContributionsLedger.toNumber() : state.netContributions.toNumber(),
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

  let finalLedgerBalance = new Decimal(0);
  let finalNetContributionsLedger = new Decimal(0);
  sortedCashEvents.forEach((evt) => {
    finalLedgerBalance = new Decimal(evt.balanceAfter);
    finalNetContributionsLedger = finalNetContributionsLedger.plus(getCashContributionDelta(evt));
  });

  const holdings = buildHoldingsFromState(state, currentPrices, !!valuationDate);
  
  if (ledgerMode) {
    const cashHolding = holdings.find(h => h.ticker === 'CASH_VND');
    const finalLedgerBalanceNum = finalLedgerBalance.toNumber();
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

  const totalMarketValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const currentCostBasis = holdings.reduce((sum, holding) => {
    if (holding.ticker === 'CASH_VND') return sum + holding.marketValue;
    return sum + (holding.totalShares * holding.netAverageCost);
  }, 0);
  
  const averageCostRealizedPnL = holdings.reduce((sum, holding) => sum + holding.averageCostRealizedPnL, 0);
  const fifoRealizedPnL = holdings.reduce((sum, holding) => sum + holding.fifoRealizedPnL, 0);
  const totalUnrealizedPnL = holdings.reduce((sum, holding) => sum + holding.unrealizedPnL, 0);
  const netPnL = totalUnrealizedPnL + averageCostRealizedPnL;
  const activeNetContributions = ledgerMode ? finalNetContributionsLedger.toNumber() : state.netContributions.toNumber();

  return {
    holdings,
    totalMarketValue,
    currentCostBasis,
    averageCostRealizedPnL,
    fifoRealizedPnL,
    totalUnrealizedPnL,
    netContributions: activeNetContributions,
    returnVsCostBasis: activeNetContributions !== 0 ? netPnL / activeNetContributions : 0,
    navSeries: buildDailyNavSeries(sortedTx, currentPrices, sortedCashEvents, valuationDate),
    calculationWarnings: state.calculationWarnings,
    cashBalanceSource: ledgerMode ? 'ledger' : 'derived',
    cashBalanceEOD: ledgerMode ? finalLedgerBalance.toNumber() : undefined,
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
    dayGrossValue: items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
  }));
}
