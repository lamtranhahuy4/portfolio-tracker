import { create } from 'zustand';
import { CashImportSummaryState, CashLedgerEvent, Holding, OpeningPosition, PortfolioMetrics, Transaction } from '@/types/portfolio';
import { calculatePortfolioMetrics } from '@/domain/portfolio/portfolioMetrics';
import { ImportBatchStatus } from '@/types/importAudit';

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

interface PortfolioState {
  transactions: Transaction[];
  cashEvents: CashLedgerEvent[];
  currentPrices: Record<string, number>;
  setTransactions: (txs: Transaction[]) => void;
  addTransactions: (newTransactions: Transaction[]) => void;
  updatePrice: (ticker: string, newPrice: number) => void;
  setCashEvents: (events: CashLedgerEvent[]) => void;
  addCashEvents: (events: CashLedgerEvent[]) => void;
  lastImportResult: TradeImportState | null;
  setLastImportResult: (result: TradeImportState | null) => void;
  lastCashImportSummary: CashImportState | null;
  setLastCashImportSummary: (summary: CashImportState | null) => void;
  valuationDate: Date | null;
  setValuationDate: (date: Date | null) => void;
  openingCutoffDate: Date | null;
  openingPositions: OpeningPosition[];
  setOpeningSnapshot: (cutoffDate: Date | null, positions: OpeningPosition[]) => void;
}

function sortTransactions(txs: Transaction[]) {
  return [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  transactions: [],
  cashEvents: [],
  currentPrices: {},
  lastImportResult: null,
  lastCashImportSummary: null,
  valuationDate: null,
  openingCutoffDate: null,
  openingPositions: [],

  setLastImportResult: (result) => set({ lastImportResult: result }),
  setLastCashImportSummary: (summary) => set({ lastCashImportSummary: summary }),
  setValuationDate: (date) => set({ valuationDate: date }),
  setOpeningSnapshot: (cutoffDate, positions) => set({ openingCutoffDate: cutoffDate, openingPositions: positions }),

  setTransactions: (txs) => set({ transactions: sortTransactions(txs) }),
  
  setCashEvents: (events) => set({
    cashEvents: [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }),

  addCashEvents: (newEvents) => set((state) => {
    const existingIds = new Set(state.cashEvents.map(e => e.id));
    const unique = newEvents.filter(e => !existingIds.has(e.id));
    return {
      cashEvents: [...state.cashEvents, ...unique].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    };
  }),

  addTransactions: (newTransactions) => set((state) => {
    const existingIds = new Set(state.transactions.map((tx) => tx.id));
    const uniqueNew = newTransactions.filter((tx) => !existingIds.has(tx.id));
    return {
      transactions: sortTransactions([...state.transactions, ...uniqueNew]),
    };
  }),

  updatePrice: (ticker, newPrice) => set((state) => ({
    currentPrices: {
      ...state.currentPrices,
      [ticker]: newPrice,
    },
  })),
}));

export const useHoldings = (): Holding[] => {
  return usePortfolioMetrics().holdings;
};

export const usePortfolioMetrics = (): PortfolioMetrics => {
  const transactions = usePortfolioStore((state) => state.transactions);
  const cashEvents = usePortfolioStore((state) => state.cashEvents);
  const currentPrices = usePortfolioStore((state) => state.currentPrices);
  const valuationDate = usePortfolioStore((state) => state.valuationDate);
  const openingCutoffDate = usePortfolioStore((state) => state.openingCutoffDate);
  const openingPositions = usePortfolioStore((state) => state.openingPositions);

  return calculatePortfolioMetrics(
    transactions,
    currentPrices,
    cashEvents,
    valuationDate,
    { cutoffDate: openingCutoffDate, positions: openingPositions }
  );
};

