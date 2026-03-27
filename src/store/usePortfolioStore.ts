import { create } from 'zustand';
import { Transaction, Holding } from '../types/portfolio';
import { calculateHoldings } from '../lib/portfolioEngine';

interface PortfolioState {
  transactions: Transaction[];
  currentPrices: Record<string, number>;
  
  setTransactions: (txs: Transaction[]) => void;
  // Bổ sung addTransactions để merge dữ liệu
  addTransactions: (newTransactions: Transaction[]) => void;
  updatePrice: (ticker: string, newPrice: number) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  transactions: [],
  currentPrices: {},

  setTransactions: (txs) => set({ transactions: txs }),
  
  addTransactions: (newTransactions) => set((state) => {
    // Merge và filter loại bỏ các giao dịch bị trùng UUID
    const existingIds = new Set(state.transactions.map(t => t.id));
    const uniqueNew = newTransactions.filter(t => !existingIds.has(t.id));
    return {
      transactions: [...state.transactions, ...uniqueNew]
    };
  }),

  updatePrice: (ticker, newPrice) => set((state) => ({
    currentPrices: {
      ...state.currentPrices,
      [ticker]: newPrice
    }
  })),
}));

export const useHoldings = (): Holding[] => {
  const transactions = usePortfolioStore((state) => state.transactions);
  const currentPrices = usePortfolioStore((state) => state.currentPrices);

  return calculateHoldings(transactions, currentPrices);
};
