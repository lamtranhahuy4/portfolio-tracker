import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { withRetry } from '@/lib/retry';
import { QUOTE_REFRESH_INTERVAL_MS } from '@/lib/constants';

interface UseDashboardDataProps {
  isMounted: boolean;
  liveTickerQuery: string;
  updatePrice: (ticker: string, price: number) => void;
  setHistoricalPrices: (prices: Record<string, Record<string, number>>) => void;
  setHistoricalPricesLastUpdated: (date: string) => void;
  historicalPricesLastUpdated: string | null;
}

export function useDashboardData({
  isMounted,
  liveTickerQuery,
  updatePrice,
  setHistoricalPrices,
  setHistoricalPricesLastUpdated,
  historicalPricesLastUpdated,
}: UseDashboardDataProps) {
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [priceFreshness, setPriceFreshness] = useState<'fresh' | 'stale' | 'unknown'>('unknown');
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [forexSummary, setForexSummary] = useState<{ usdSell: number | null; usdBuyTransfer: number | null } | null>(null);

  useEffect(() => {
    if (!isMounted || !liveTickerQuery) return;

    let active = true;
    const refresh = async () => {
      try {
        setIsRefreshingPrices(true);
        const response = await withRetry(
          () => fetch(`/api/quotes?tickers=${encodeURIComponent(liveTickerQuery)}`, { cache: 'no-store' }),
          { maxRetries: 2, baseDelayMs: 1000 }
        );
        if (!response.ok) return;
        const data = await response.json() as { quotes?: Array<{ ticker: string; price: number }> };
        if (!active || !data.quotes) return;
        data.quotes.forEach((quote) => updatePrice(quote.ticker, quote.price));
        setLastPriceUpdate(new Date());
        setPriceFreshness('fresh');
      } catch (error) {
        console.error('Failed to fetch quotes:', error);
        setPriceFreshness('stale');
      } finally {
        setIsRefreshingPrices(false);
      }
    };

    refresh();
    const interval = window.setInterval(refresh, QUOTE_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isMounted, liveTickerQuery, updatePrice]);

  useEffect(() => {
    if (!lastPriceUpdate) return;
    const interval = setInterval(() => {
      const ageMs = Date.now() - lastPriceUpdate.getTime();
      const ageMinutes = ageMs / (1000 * 60);
      if (ageMinutes > 15) {
        setPriceFreshness('stale');
      } else {
        setPriceFreshness('fresh');
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [lastPriceUpdate]);

  const fetchHistoricalPrices = useCallback(async () => {
    if (!liveTickerQuery) return;
    
    try {
      const response = await fetch(`/api/historical-prices?tickers=${encodeURIComponent(liveTickerQuery)}`);
      if (!response.ok) return;
      const data = await response.json() as { prices: Record<string, Record<string, number>>; lastUpdated: string };
      if (data.prices) {
        setHistoricalPrices(data.prices);
        setHistoricalPricesLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      console.error('Failed to fetch historical prices:', error);
    }
  }, [liveTickerQuery, setHistoricalPrices, setHistoricalPricesLastUpdated]);

  const shouldUpdateHistoricalPrices = useCallback(() => {
    if (!historicalPricesLastUpdated) return true;
    const lastUpdate = new Date(historicalPricesLastUpdated);
    const now = new Date();
    const today15 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);
    
    if (now >= today15 && lastUpdate < today15) {
      return true;
    }
    if (now < today15 && lastUpdate < new Date(today15.getTime() - 24 * 60 * 60 * 1000)) {
      return true;
    }
    return false;
  }, [historicalPricesLastUpdated]);

  useEffect(() => {
    if (!isMounted || !liveTickerQuery) return;
    
    if (shouldUpdateHistoricalPrices()) {
      fetchHistoricalPrices();
    }
    
    const checkInterval = setInterval(() => {
      if (shouldUpdateHistoricalPrices()) {
        fetchHistoricalPrices();
      }
    }, 60 * 60 * 1000);
    
    return () => clearInterval(checkInterval);
  }, [isMounted, liveTickerQuery, fetchHistoricalPrices, shouldUpdateHistoricalPrices]);

  useEffect(() => {
    if (!isMounted) return;
    const fetchForex = async () => {
      try {
        const res = await fetch('/api/forex-summary', { cache: 'no-store' });
        if (res.ok) setForexSummary(await res.json());
      } catch {}
    };
    fetchForex();
    const interval = setInterval(fetchForex, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isMounted]);

  const handleManualRefresh = async () => {
    if (!liveTickerQuery) return;
    setIsRefreshingPrices(true);
    try {
      const response = await withRetry(
        () => fetch(`/api/quotes?tickers=${encodeURIComponent(liveTickerQuery)}`, { cache: 'no-store' }),
        { maxRetries: 2, baseDelayMs: 1000 }
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json() as { quotes?: Array<{ ticker: string; price: number }> };
      if (!data.quotes) throw new Error('Invalid response');
      data.quotes.forEach((quote) => updatePrice(quote.ticker, quote.price));
      setLastPriceUpdate(new Date());
      setPriceFreshness('fresh');
      toast.success('Đã cập nhật giá thành công');
    } catch {
      toast.error('Không thể cập nhật giá. Vui lòng thử lại.');
      setPriceFreshness('stale');
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  return {
    lastPriceUpdate,
    priceFreshness,
    isRefreshingPrices,
    forexSummary,
    handleManualRefresh,
  };
}
