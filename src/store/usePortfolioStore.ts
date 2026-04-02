import { create } from 'zustand';
import { CashImportSummaryState, CashLedgerEvent, Holding, OpeningPosition, PortfolioMetrics, Transaction } from '@/types/portfolio';
import { calculatePortfolioMetrics } from '@/domain/portfolio/portfolioMetrics';
import { ImportBatchStatus } from '@/types/importAudit';
import { toMoney } from '@/domain/portfolio/primitives';

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
  globalCutoffDate: Date | null;
  initialNetContributions: number;
  initialCashBalance: number;
  openingPositions: OpeningPosition[];
  setOpeningSnapshot: (positions: OpeningPosition[]) => void;
  feeDebt: number;
  setFeeDebt: (feeDebt: number) => void;
  setPortfolioSettings: (settings: { globalCutoffDate: Date | null, initialNetContributions: number, initialCashBalance: number }) => void;
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
  globalCutoffDate: null,
  initialNetContributions: 0,
  initialCashBalance: 0,
  openingPositions: [],
  feeDebt: 0,

  setLastImportResult: (result) => set({ lastImportResult: result }),
  setLastCashImportSummary: (summary) => set({ lastCashImportSummary: summary }),
  setValuationDate: (date) => set({ valuationDate: date }),
  setOpeningSnapshot: (positions) => set({ openingPositions: positions }),
  setFeeDebt: (feeDebt) => set({ feeDebt }),
  setPortfolioSettings: (settings) => set({ 
    globalCutoffDate: settings.globalCutoffDate,
    initialNetContributions: settings.initialNetContributions,
    initialCashBalance: settings.initialCashBalance
  }),

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
  const globalCutoffDate = usePortfolioStore((state) => state.globalCutoffDate);
  const initialNetContributions = usePortfolioStore((state) => state.initialNetContributions);
  const initialCashBalance = usePortfolioStore((state) => state.initialCashBalance);
  const openingPositions = usePortfolioStore((state) => state.openingPositions);
  const feeDebt = usePortfolioStore((state) => state.feeDebt);

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
        feeDebt: toMoney(feeDebt)
      } 
    },
    feeDebt
  );
};
