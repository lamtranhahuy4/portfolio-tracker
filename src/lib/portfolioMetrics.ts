import { GroupedTransactionsByDay, Holding, NavPoint, PortfolioMetrics, Transaction } from '@/types/portfolio';

type HoldingState = {
  assetClass: Holding['assetClass'];
  ticker: string;
  totalShares: number;
  averageCost: number;
  averageCostRealizedPnL: number;
  fifoRealizedPnL: number;
};

type Lot = {
  remainingQty: number;
  unitCostNet: number;
};

type ReplayState = {
  holdingsMap: Map<string, HoldingState>;
  lotsMap: Map<string, Lot[]>;
  lastKnownPrices: Map<string, number>;
  netContributions: number;
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
    lastKnownPrices: new Map<string, number>(),
    netContributions: 0,
    calculationWarnings: [],
  };
}

function getCashHolding(holdingsMap: Map<string, HoldingState>): HoldingState {
  if (!holdingsMap.has('CASH_VND')) {
    holdingsMap.set('CASH_VND', {
      assetClass: 'CASH',
      ticker: 'CASH_VND',
      totalShares: 0,
      averageCost: 1,
      averageCostRealizedPnL: 0,
      fifoRealizedPnL: 0,
    });
  }

  return holdingsMap.get('CASH_VND')!;
}

function getStockHolding(holdingsMap: Map<string, HoldingState>, ticker: string): HoldingState {
  if (!holdingsMap.has(ticker)) {
    holdingsMap.set(ticker, {
      assetClass: 'STOCK',
      ticker,
      totalShares: 0,
      averageCost: 0,
      averageCostRealizedPnL: 0,
      fifoRealizedPnL: 0,
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

function applyTransaction(state: ReplayState, tx: Transaction) {
  const cash = getCashHolding(state.holdingsMap);
  const parsedDate = new Date(tx.date);
  const dateLabel = Number.isNaN(parsedDate.getTime()) ? String(tx.date) : parsedDate.toISOString();

  if (tx.assetClass === 'STOCK') {
    const stock = getStockHolding(state.holdingsMap, tx.ticker);
    const lots = getLots(state.lotsMap, tx.ticker);

    if (tx.type === 'BUY') {
      const previousCostBasis = stock.totalShares * stock.averageCost;
      const nextShares = stock.totalShares + tx.quantity;
      stock.averageCost = nextShares > 0 ? (previousCostBasis + tx.totalValue) / nextShares : 0;
      stock.totalShares = nextShares;
      lots.push({
        remainingQty: tx.quantity,
        unitCostNet: tx.totalValue / tx.quantity,
      });
      cash.totalShares -= tx.totalValue;
      state.lastKnownPrices.set(tx.ticker, tx.price);
      return;
    }

    if (tx.type === 'SELL') {
      if (stock.totalShares < tx.quantity) {
        state.calculationWarnings.push(`Sell quantity exceeds holdings for ${tx.ticker} on ${dateLabel}.`);
      }

      const quantityToSell = Math.min(tx.quantity, stock.totalShares);
      const averageCostBasisOfSoldShares = stock.averageCost * quantityToSell;
      const averageCostNetProceeds = tx.price * quantityToSell - tx.fee - tx.tax;
      stock.totalShares = Math.max(0, stock.totalShares - tx.quantity);
      stock.averageCostRealizedPnL += averageCostNetProceeds - averageCostBasisOfSoldShares;

      let fifoCostBasis = 0;
      let remainingQty = quantityToSell;
      while (remainingQty > 0 && lots.length > 0) {
        const lot = lots[0];
        const consumed = Math.min(remainingQty, lot.remainingQty);
        fifoCostBasis += consumed * lot.unitCostNet;
        lot.remainingQty -= consumed;
        remainingQty -= consumed;
        if (lot.remainingQty <= 0) {
          lots.shift();
        }
      }

      if (remainingQty > 0) {
        state.calculationWarnings.push(`FIFO lots exhausted for ${tx.ticker} on ${dateLabel}.`);
      }

      const fifoNetProceeds = tx.price * quantityToSell - tx.fee - tx.tax;
      stock.fifoRealizedPnL += fifoNetProceeds - fifoCostBasis;
      cash.totalShares += fifoNetProceeds;
      state.lastKnownPrices.set(tx.ticker, tx.price);
      return;
    }

    if (tx.type === 'STOCK_DIVIDEND') {
      const previousCostBasis = stock.totalShares * stock.averageCost;
      stock.totalShares += tx.quantity;
      stock.averageCost = stock.totalShares > 0 ? previousCostBasis / stock.totalShares : 0;
      lots.push({
        remainingQty: tx.quantity,
        unitCostNet: 0,
      });
      return;
    }

    if (tx.type === 'DIVIDEND') {
      cash.totalShares += tx.totalValue;
      return;
    }
  }

  if (tx.type === 'DEPOSIT') {
    cash.totalShares += tx.totalValue;
    state.netContributions += tx.totalValue;
    return;
  }

  if (tx.type === 'INTEREST') {
    cash.totalShares += tx.totalValue;
    return;
  }

  if (tx.type === 'WITHDRAW') {
    cash.totalShares -= tx.totalValue;
    state.netContributions -= tx.totalValue;
  }
}

function buildHoldingsFromState(
  state: ReplayState,
  currentPrices: Record<string, number>,
  priceOverrides?: Map<string, number>
) {
  const holdings: Holding[] = [];

  for (const [ticker, holding] of state.holdingsMap.entries()) {
    const fallbackPrice = priceOverrides?.get(ticker)
      ?? state.lastKnownPrices.get(ticker)
      ?? holding.averageCost;
    const currentPrice = ticker === 'CASH_VND'
      ? 1
      : (currentPrices[ticker] ?? fallbackPrice);
    const marketValue = holding.totalShares * currentPrice;
    const unrealizedPnL = ticker === 'CASH_VND'
      ? 0
      : marketValue - (holding.totalShares * holding.averageCost);

    if (
      holding.totalShares > 0 ||
      holding.averageCostRealizedPnL !== 0 ||
      holding.fifoRealizedPnL !== 0
    ) {
      holdings.push({
        ...holding,
        currentPrice,
        marketValue,
        unrealizedPnL,
      });
    }
  }

  return holdings.sort((a, b) => {
    if (a.ticker === 'CASH_VND') return 1;
    if (b.ticker === 'CASH_VND') return -1;
    return b.marketValue - a.marketValue;
  });
}

export function buildDailyNavSeries(
  transactions: Transaction[],
  currentPrices: Record<string, number>
): NavPoint[] {
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sortedTx.length === 0) return [];

  const state = createEmptyState();
  const navSeries: NavPoint[] = [];
  let txIndex = 0;

  const startDate = new Date(sortedTx[0].date);
  const endDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    while (txIndex < sortedTx.length) {
      const txDate = new Date(sortedTx[txIndex].date);
      txDate.setHours(0, 0, 0, 0);
      if (txDate.getTime() > cursor.getTime()) break;
      applyTransaction(state, sortedTx[txIndex]);
      txIndex += 1;
    }

    const dayKey = getDateKey(cursor);
    const dayPriceOverrides = new Map(state.lastKnownPrices);
    if (dayKey === getDateKey(new Date())) {
      Object.entries(currentPrices).forEach(([ticker, price]) => {
        dayPriceOverrides.set(ticker, price);
      });
    }

    const holdings = buildHoldingsFromState(state, currentPrices, dayPriceOverrides);
    const cashValue = holdings.find((holding) => holding.ticker === 'CASH_VND')?.marketValue ?? 0;
    const investedMarketValue = holdings
      .filter((holding) => holding.ticker !== 'CASH_VND')
      .reduce((sum, holding) => sum + holding.marketValue, 0);

    navSeries.push({
      date: dayKey,
      netAssetValue: cashValue + investedMarketValue,
      cashValue,
      investedMarketValue,
      netContributions: state.netContributions,
    });
  }

  return navSeries;
}

export function calculatePortfolioMetrics(
  transactions: Transaction[],
  currentPrices: Record<string, number>
): PortfolioMetrics {
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const state = createEmptyState();

  sortedTx.forEach((tx) => applyTransaction(state, tx));

  const holdings = buildHoldingsFromState(state, currentPrices);
  const totalMarketValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const currentCostBasis = holdings.reduce((sum, holding) => {
    if (holding.ticker === 'CASH_VND') return sum + holding.marketValue;
    return sum + (holding.totalShares * holding.averageCost);
  }, 0);
  const averageCostRealizedPnL = holdings.reduce((sum, holding) => sum + holding.averageCostRealizedPnL, 0);
  const fifoRealizedPnL = holdings.reduce((sum, holding) => sum + holding.fifoRealizedPnL, 0);
  const totalUnrealizedPnL = holdings.reduce((sum, holding) => sum + holding.unrealizedPnL, 0);
  const netPnL = totalUnrealizedPnL + averageCostRealizedPnL;

  return {
    holdings,
    totalMarketValue,
    currentCostBasis,
    averageCostRealizedPnL,
    fifoRealizedPnL,
    totalUnrealizedPnL,
    netContributions: state.netContributions,
    returnVsCostBasis: state.netContributions !== 0 ? netPnL / state.netContributions : 0,
    navSeries: buildDailyNavSeries(sortedTx, currentPrices),
    calculationWarnings: state.calculationWarnings,
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
