'use client';

import { useRef } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Transaction } from '@/types/portfolio';

export default function StoreInitializer({ initialTransactions }: { initialTransactions: Transaction[] }) {
  const initialized = useRef(false);

  if (!initialized.current) {
    usePortfolioStore.getState().setTransactions(initialTransactions);
    initialized.current = true;
  }

  // Component này chỉ xử lý logic đồng bộ state ban đầu, không render bất kỳ khối UI nào
  return null;
}
