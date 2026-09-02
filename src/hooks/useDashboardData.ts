"use client";
import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { QUOTE_REFRESH_INTERVAL_MS } from '@/lib/constants';

interface UseDashboardDataProps {
  isMounted: boolean;
  liveTickerQuery: string;
  updatePrice: (ticker: string, price: number) => void;
  updatePricesBatch: (updates: Record<string, number>) => void;
  setHistoricalPrices: (prices: Record<string, Record<string, number>>) => void;
  setHistoricalPricesLastUpdated: (date: string) => void;
  historicalPricesLastUpdated: string | null;
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('API Error');
  return r.json();
});

export function useDashboardData({
  isMounted,
  liveTickerQuery,
  updatePrice,
  updatePricesBatch,
  setHistoricalPrices,
  setHistoricalPricesLastUpdated,
  historicalPricesLastUpdated,
}: UseDashboardDataProps) {
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  const { 
    data: quotesData,
    error: quotesError,
    isValidating: isRefreshingPrices,
    mutate: mutateQuotes 
  } = useSWR<{ quotes: Array<{ ticker: string; price: number }> }>(
    isMounted && liveTickerQuery ? `/api/quotes?tickers=${encodeURIComponent(liveTickerQuery)}` : null,
    fetcher,
    {
      refreshInterval: QUOTE_REFRESH_INTERVAL_MS,
      revalidateOnFocus: true,
      onSuccess: (data) => {
        if (data.quotes && data.quotes.length > 0) {
          const batch: Record<string, number> = {};
          data.quotes.forEach((q) => {
            batch[q.ticker] = q.price;
          });
          updatePricesBatch(batch);
          setLastPriceUpdate(new Date());
        }
      }
    }
  );

  const shouldUpdateHistoricalPrices = useCallback(() => {
    if (!historicalPricesLastUpdated) return true;
    const lastUpdate = new Date(historicalPricesLastUpdated);
    const now = new Date();
    const today15 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);
    
    if (now >= today15 && lastUpdate < today15) return true;
    if (now < today15 && lastUpdate < new Date(today15.getTime() - 24 * 60 * 60 * 1000)) return true;
    return false;
  }, [historicalPricesLastUpdated]);

  const needsHistoricalUpdate = isMounted && liveTickerQuery && shouldUpdateHistoricalPrices();

  useSWR<{ prices: Record<string, Record<string, number>>; lastUpdated: string }>(
    needsHistoricalUpdate ? `/api/historical-prices?tickers=${encodeURIComponent(liveTickerQuery)}` : null,
    fetcher,
    {
      refreshInterval: 60 * 60 * 1000,
      onSuccess: (data) => {
        if (data.prices) {
          setHistoricalPrices(data.prices);
          setHistoricalPricesLastUpdated(data.lastUpdated);
        }
      }
    }
  );

  const { data: forexSummary } = useSWR<{ usdSell: number | null; usdBuyTransfer: number | null }>(
    isMounted ? '/api/forex-summary' : null,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000
    }
  );

  const handleManualRefresh = async () => {
    if (!liveTickerQuery) return;
    try {
      await mutateQuotes();
      toast.success('Đã cập nhật giá thành công');
    } catch {
      toast.error('Không thể cập nhật giá. Vui lòng thử lại.');
    }
  };

  const priceFreshness = quotesError ? 'stale' : (quotesData ? 'fresh' : 'unknown');

  return {
    lastPriceUpdate,
    priceFreshness,
    isRefreshingPrices,
    forexSummary: forexSummary || null,
    handleManualRefresh,
  };
}
