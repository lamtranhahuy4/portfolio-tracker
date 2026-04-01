'use client';

import { useEffect } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { CashLedgerEvent, OpeningPosition, Transaction } from '@/types/portfolio';

export default function StoreInitializer({ 
  initialTransactions,
  initialCashEvents = [],
  initialOpeningPositions = [],
  initialOpeningCutoffDate = null,
}: { 
  initialTransactions: Transaction[],
  initialCashEvents?: CashLedgerEvent[],
  initialOpeningPositions?: OpeningPosition[],
  initialOpeningCutoffDate?: Date | null,
}) {
  const setTransactions = usePortfolioStore((state) => state.setTransactions);
  const setCashEvents = usePortfolioStore((state) => state.setCashEvents);
  const setOpeningSnapshot = usePortfolioStore((state) => state.setOpeningSnapshot);

  useEffect(() => {
    setTransactions(initialTransactions);
    setCashEvents(initialCashEvents);
    setOpeningSnapshot(initialOpeningCutoffDate, initialOpeningPositions);
  }, [initialTransactions, initialCashEvents, initialOpeningCutoffDate, initialOpeningPositions, setTransactions, setCashEvents, setOpeningSnapshot]);

  return null;
}
