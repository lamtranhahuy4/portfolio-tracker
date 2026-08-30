'use client';

import { useEffect, useRef } from 'react';
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
  const initialized = useRef(false);
  const setTransactions = usePortfolioStore((state) => state.setTransactions);
  const setCashEvents = usePortfolioStore((state) => state.setCashEvents);
  const setOpeningSnapshot = usePortfolioStore((state) => state.setOpeningSnapshot);
  const setFeeDebt = usePortfolioStore((state) => state.setFeeDebt);
  const setPortfolioSettings = usePortfolioStore((state) => state.setPortfolioSettings);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTransactions(initialTransactions);
    setCashEvents(initialCashEvents);
    setOpeningSnapshot(initialOpeningPositions);
    setFeeDebt(initialPortfolioSettings.feeDebt);
    setPortfolioSettings({
      globalCutoffDate: initialPortfolioSettings.globalCutoffDate,
      initialNetContributions: initialPortfolioSettings.initialNetContributions,
      initialCashBalance: initialPortfolioSettings.initialCashBalance
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
