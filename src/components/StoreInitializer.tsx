'use client';

import { useEffect } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { CashLedgerEvent, OpeningPosition, Transaction } from '@/types/portfolio';

export default function StoreInitializer({ 
  initialTransactions,
  initialCashEvents = [],
  initialOpeningPositions = [],
  initialOpeningCutoffDate = null,
  initialFeeDebt = 0,
}: { 
  initialTransactions: Transaction[],
  initialCashEvents?: CashLedgerEvent[],
  initialOpeningPositions?: OpeningPosition[],
  initialOpeningCutoffDate?: Date | null,
  initialFeeDebt?: number,
}) {
  const setTransactions = usePortfolioStore((state) => state.setTransactions);
  const setCashEvents = usePortfolioStore((state) => state.setCashEvents);
  const setOpeningSnapshot = usePortfolioStore((state) => state.setOpeningSnapshot);
  const setFeeDebt = usePortfolioStore((state) => state.setFeeDebt);

  useEffect(() => {
    setTransactions(initialTransactions);
    setCashEvents(initialCashEvents);
    setOpeningSnapshot(initialOpeningCutoffDate, initialOpeningPositions);
    setFeeDebt(initialFeeDebt);
  }, [initialTransactions, initialCashEvents, initialOpeningCutoffDate, initialOpeningPositions, initialFeeDebt, setTransactions, setCashEvents, setOpeningSnapshot, setFeeDebt]);

  return null;
}
