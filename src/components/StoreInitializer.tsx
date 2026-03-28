'use client';

import { useEffect } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { CashLedgerEvent, Transaction } from '@/types/portfolio';

export default function StoreInitializer({ 
  initialTransactions,
  initialCashEvents = []
}: { 
  initialTransactions: Transaction[],
  initialCashEvents?: CashLedgerEvent[]
}) {
  const setTransactions = usePortfolioStore((state) => state.setTransactions);
  const setCashEvents = usePortfolioStore((state) => state.setCashEvents);

  useEffect(() => {
    setTransactions(initialTransactions);
    setCashEvents(initialCashEvents);
  }, [initialTransactions, initialCashEvents, setTransactions, setCashEvents]);

  return null;
}
