/**
 * Zustand Store — organized in logical slices.
 *
 * Each slice is defined as a `StateCreator` factory so it can be composed,
 * tested, and reasoned about independently. The exported `usePortfolioStore`
 * is fully backward-compatible: all existing selectors keep working.
 *
 * Memoization: calculatePortfolioMetrics is wrapped with memoizeOne to cache
 * results based on input arguments, reducing unnecessary recomputations when
 * price updates trigger re-renders with unchanged portfolio data.
 */
import { create, StateCreator } from 'zustand';
import { useMemo } from 'react';
import {
  CashImportSummaryState,
  CashLedgerEvent,
  Holding,
  OpeningPosition,
  PortfolioMetrics,
  Transaction,
} from '@/types/portfolio';
import { calculatePortfolioMetrics } from '@/domain/portfolio/portfolioMetrics';
import { ImportBatchStatus } from '@/types/importAudit';
import { toMoney } from '@/domain/portfolio/primitives';
import { memoizeOne, shallowEqual } from '@/lib/memoization';

// ─── Memoized Portfolio Metrics Calculator ──────────────────────────────────

const memoizedCalculateMetrics = memoizeOne(
  (
    transactions: Transaction[],
    currentPrices: Record<string, number>,
    cashEvents: CashLedgerEvent[],
    valuationDate: Date | null,
    globalCutoffDate: Date | null,
    initialNetContributions: number,
    initialCashBalance: number,
    openingPositions: OpeningPosition[],
    feeDebt: number
  ): PortfolioMetrics => {
    return calculatePortfolioMetrics(
      transactions,
      currentPrices,
      cashEvents,
      valuationDate,
      {
        positions: openingPositions,
        settings: {
          globalCutoffDate,
          initialNetContributions: toMoney(initialNetContributions),
          initialCashBalance: toMoney(initialCashBalance),
          feeDebt: toMoney(feeDebt),
        },
      },
      feeDebt
    );
  },
  shallowEqual
);

// ─── Local types ─────────────────────────────────────────────────────────────

type TradeImportState = import('@/types/portfolio').ImportParseResult & {
  importedAt: Date;
  summary: import('@/types/portfolio').ImportSummary & {
    batchId?: string;
    status?: ImportBatchStatus;
    importedAt?: Date;
  };
};

type CashImportState = CashImportSummaryState & {
  batchId?: string;
  status?: ImportBatchStatus;
};

// ─── Slice: Transactions ─────────────────────────────────────────────────────

interface TransactionsSlice {
  transactions: Transaction[];
  setTransactions: (txs: Transaction[]) => void;
  addTransactions: (newTransactions: Transaction[]) => void;
}

function sortByDate<T extends { date: Date | string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const createTransactionsSlice: StateCreator<PortfolioState, [], [], TransactionsSlice> = (set) => ({
  transactions: [],

  setTransactions: (txs) => set({ transactions: sortByDate(txs) }),

  addTransactions: (newTransactions) =>
    set((state) => {
      const existingIds = new Set(state.transactions.map((tx) => tx.id));
      const uniqueNew = newTransactions.filter((tx) => !existingIds.has(tx.id));
      return { transactions: sortByDate([...state.transactions, ...uniqueNew]) };
    }),
});

// ─── Slice: Prices ───────────────────────────────────────────────────────────

interface PricesSlice {
  currentPrices: Record<string, number>;
  updatePrice: (ticker: string, newPrice: number) => void;
}

const createPricesSlice: StateCreator<PortfolioState, [], [], PricesSlice> = (set) => ({
  currentPrices: {},

  updatePrice: (ticker, newPrice) =>
    set((state) => ({
      currentPrices: { ...state.currentPrices, [ticker]: newPrice },
    })),
});

// ─── Slice: Cash Events ───────────────────────────────────────────────────────

interface CashEventsSlice {
  cashEvents: CashLedgerEvent[];
  setCashEvents: (events: CashLedgerEvent[]) => void;
  addCashEvents: (events: CashLedgerEvent[]) => void;
}

const createCashEventsSlice: StateCreator<PortfolioState, [], [], CashEventsSlice> = (set) => ({
  cashEvents: [],

  setCashEvents: (events) => set({ cashEvents: sortByDate(events) }),

  addCashEvents: (newEvents) =>
    set((state) => {
      const existingIds = new Set(state.cashEvents.map((e) => e.id));
      const unique = newEvents.filter((e) => !existingIds.has(e.id));
      return { cashEvents: sortByDate([...state.cashEvents, ...unique]) };
    }),
});

// ─── Slice: Portfolio Settings ────────────────────────────────────────────────

interface PortfolioSettingsSlice {
  globalCutoffDate: Date | null;
  initialNetContributions: number;
  initialCashBalance: number;
  openingPositions: OpeningPosition[];
  feeDebt: number;
  valuationDate: Date | null;
  setValuationDate: (date: Date | null) => void;
  setOpeningSnapshot: (positions: OpeningPosition[]) => void;
  setFeeDebt: (feeDebt: number) => void;
  setPortfolioSettings: (settings: {
    globalCutoffDate: Date | null;
    initialNetContributions: number;
    initialCashBalance: number;
  }) => void;
}

const createPortfolioSettingsSlice: StateCreator<PortfolioState, [], [], PortfolioSettingsSlice> = (set) => ({
  globalCutoffDate: null,
  initialNetContributions: 0,
  initialCashBalance: 0,
  openingPositions: [],
  feeDebt: 0,
  valuationDate: null,

  setValuationDate: (date) => set({ valuationDate: date }),
  setOpeningSnapshot: (positions) => set({ openingPositions: positions }),
  setFeeDebt: (feeDebt) => set({ feeDebt }),
  setPortfolioSettings: (settings) =>
    set({
      globalCutoffDate: settings.globalCutoffDate,
      initialNetContributions: settings.initialNetContributions,
      initialCashBalance: settings.initialCashBalance,
    }),
});

// ─── Slice: Import Status ────────────────────────────────────────────────────

interface ImportStatusSlice {
  lastImportResult: TradeImportState | null;
  lastCashImportSummary: CashImportState | null;
  setLastImportResult: (result: TradeImportState | null) => void;
  setLastCashImportSummary: (summary: CashImportState | null) => void;
}

const createImportStatusSlice: StateCreator<PortfolioState, [], [], ImportStatusSlice> = (set) => ({
  lastImportResult: null,
  lastCashImportSummary: null,

  setLastImportResult: (result) => set({ lastImportResult: result }),
  setLastCashImportSummary: (summary) => set({ lastCashImportSummary: summary }),
});

// ─── Composed Store ──────────────────────────────────────────────────────────

type PortfolioState = TransactionsSlice &
  PricesSlice &
  CashEventsSlice &
  PortfolioSettingsSlice &
  ImportStatusSlice;

export const usePortfolioStore = create<PortfolioState>()((...a) => ({
  ...createTransactionsSlice(...a),
  ...createPricesSlice(...a),
  ...createCashEventsSlice(...a),
  ...createPortfolioSettingsSlice(...a),
  ...createImportStatusSlice(...a),
}));

// ─── Derived Selectors ───────────────────────────────────────────────────────

export const useHoldings = (): Holding[] => {
  return usePortfolioMetrics().holdings;
};

export const usePortfolioMetrics = (): PortfolioMetrics => {
  const transactions = usePortfolioStore((state) => state.transactions);
  const cashEvents = usePortfolioStore((state) => state.cashEvents);
  const currentPrices = usePortfolioStore((state) => state.currentPrices);
  const valuationDate = usePortfolioStore((state) => state.valuationDate);
  const globalCutoffDate = usePortfolioStore((state) => state.globalCutoffDate);
  const initialNetContributions = usePortfolioStore((state) => state.initialNetContributions);
  const initialCashBalance = usePortfolioStore((state) => state.initialCashBalance);
  const openingPositions = usePortfolioStore((state) => state.openingPositions);
  const feeDebt = usePortfolioStore((state) => state.feeDebt);

  return useMemo(
    () =>
      memoizedCalculateMetrics(
        transactions,
        currentPrices,
        cashEvents,
        valuationDate,
        globalCutoffDate,
        initialNetContributions,
        initialCashBalance,
        openingPositions,
        feeDebt
      ),
    [
      transactions,
      currentPrices,
      cashEvents,
      valuationDate,
      globalCutoffDate,
      initialNetContributions,
      initialCashBalance,
      openingPositions,
      feeDebt,
    ]
  );
};
