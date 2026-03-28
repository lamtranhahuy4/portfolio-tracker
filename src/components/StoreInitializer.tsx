'use client';

import { useEffect, useRef } from 'react';
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
  const initialized = useRef(false);

  if (!initialized.current) {
    setTransactions(initialTransactions);
    setCashEvents(initialCashEvents);
    initialized.current = true;
  }

  return null;
}
