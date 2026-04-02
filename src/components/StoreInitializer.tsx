'use client';

import { useEffect } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { CashLedgerEvent, OpeningPosition, Transaction } from '@/types/portfolio';

export default function StoreInitializer({ 
  initialTransactions,
  initialCashEvents = [],
  initialOpeningPositions = [],
  initialPortfolioSettings,
}: { 
  initialTransactions: Transaction[],
  initialCashEvents?: CashLedgerEvent[],
  initialOpeningPositions?: OpeningPosition[],
  initialPortfolioSettings: {
    feeDebt: number,
    globalCutoffDate: Date | null,
    initialNetContributions: number,
    initialCashBalance: number
  }
}) {
  const setTransactions = usePortfolioStore((state) => state.setTransactions);
  const setCashEvents = usePortfolioStore((state) => state.setCashEvents);
  const setOpeningSnapshot = usePortfolioStore((state) => state.setOpeningSnapshot);
  const setFeeDebt = usePortfolioStore((state) => state.setFeeDebt);
  const setPortfolioSettings = usePortfolioStore((state) => state.setPortfolioSettings);

  useEffect(() => {
    setTransactions(initialTransactions);
    setCashEvents(initialCashEvents);
    setOpeningSnapshot(initialOpeningPositions);
    setFeeDebt(initialPortfolioSettings.feeDebt);
    setPortfolioSettings({
      globalCutoffDate: initialPortfolioSettings.globalCutoffDate,
      initialNetContributions: initialPortfolioSettings.initialNetContributions,
      initialCashBalance: initialPortfolioSettings.initialCashBalance
    });
  }, [initialTransactions, initialCashEvents, initialOpeningPositions, initialPortfolioSettings, setTransactions, setCashEvents, setOpeningSnapshot, setFeeDebt, setPortfolioSettings]);

  return null;
}
