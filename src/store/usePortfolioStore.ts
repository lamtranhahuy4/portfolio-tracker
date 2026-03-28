import { create } from 'zustand';
import { Holding, Transaction } from '@/types/portfolio';
import { calculateHoldings } from '@/lib/portfolioEngine';

interface PortfolioState {
  transactions: Transaction[];
  currentPrices: Record<string, number>;
  setTransactions: (txs: Transaction[]) => void;
  addTransactions: (newTransactions: Transaction[]) => void;
  updatePrice: (ticker: string, newPrice: number) => void;
  lastImportResult: (import('@/types/portfolio').ImportParseResult & { importedAt: Date }) | null;
  setLastImportResult: (result: (import('@/types/portfolio').ImportParseResult & { importedAt: Date }) | null) => void;
}

function sortTransactions(txs: Transaction[]) {
  return [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  transactions: [],
  currentPrices: {},
  lastImportResult: null,

  setLastImportResult: (result) => set({ lastImportResult: result }),

  setTransactions: (txs) => set({ transactions: sortTransactions(txs) }),

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
  const transactions = usePortfolioStore((state) => state.transactions);
  const currentPrices = usePortfolioStore((state) => state.currentPrices);

  return calculateHoldings(transactions, currentPrices);
};

