import { create } from 'zustand';
import { CashImportSummaryState, CashLedgerEvent, Holding, PortfolioMetrics, Transaction } from '@/types/portfolio';
import { calculatePortfolioMetrics } from '@/lib/portfolioMetrics';

interface PortfolioState {
  transactions: Transaction[];
  cashEvents: CashLedgerEvent[];
  currentPrices: Record<string, number>;
  setTransactions: (txs: Transaction[]) => void;
  addTransactions: (newTransactions: Transaction[]) => void;
  updatePrice: (ticker: string, newPrice: number) => void;
  setCashEvents: (events: CashLedgerEvent[]) => void;
  addCashEvents: (events: CashLedgerEvent[]) => void;
  lastImportResult: (import('@/types/portfolio').ImportParseResult & { importedAt: Date }) | null;
  setLastImportResult: (result: (import('@/types/portfolio').ImportParseResult & { importedAt: Date }) | null) => void;
  lastCashImportSummary: CashImportSummaryState | null;
  setLastCashImportSummary: (summary: CashImportSummaryState | null) => void;
  valuationDate: Date | null;
  setValuationDate: (date: Date | null) => void;
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

  setLastImportResult: (result) => set({ lastImportResult: result }),
  setLastCashImportSummary: (summary) => set({ lastCashImportSummary: summary }),
  setValuationDate: (date) => set({ valuationDate: date }),

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

  return calculatePortfolioMetrics(transactions, currentPrices, cashEvents);
};

