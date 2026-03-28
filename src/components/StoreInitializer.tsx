'use client';

import { useEffect } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Transaction } from '@/types/portfolio';

export default function StoreInitializer({ initialTransactions }: { initialTransactions: Transaction[] }) {
  const setTransactions = usePortfolioStore((state) => state.setTransactions);

  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions, setTransactions]);

  return null;
}

