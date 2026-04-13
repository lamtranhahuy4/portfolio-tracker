'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface PriceUpdate {
  ticker: string;
  price: number | null;
  timestamp: string;
}

interface UseRealtimePricesOptions {
  enabled?: boolean;
  tickers: string[];
  onPriceUpdate?: (update: PriceUpdate) => void;
}

interface UseRealtimePricesReturn {
  isConnected: boolean;
  lastUpdate: Date | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useRealtimePrices(
  options: UseRealtimePricesOptions
): UseRealtimePricesReturn {
  const { enabled = true, tickers, onPriceUpdate } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const updatePrice = usePortfolioStore((state) => state.updatePrice);

  const connect = useCallback(() => {
    if (tickers.length === 0 || !enabled) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const tickerParam = tickers.join(',');
    const url = `/api/stream/prices?tickers=${encodeURIComponent(tickerParam)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const updates: PriceUpdate[] = JSON.parse(event.data);
        
        updates.forEach((update) => {
          if (update.price !== null) {
            updatePrice(update.ticker, update.price);
            onPriceUpdate?.(update);
          }
        });
        
        setLastUpdate(new Date());
      } catch {
        console.error('[SSE] Failed to parse price update');
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      
      setTimeout(() => {
        if (enabled && tickers.length > 0) {
          connect();
        }
      }, 5000);
    };
  }, [tickers, enabled, updatePrice, onPriceUpdate]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (enabled && tickers.length > 0) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [tickers.join(','), enabled]);

  return {
    isConnected,
    lastUpdate,
    reconnect,
    disconnect,
  };
}

export function useHoldingsRealtimePrices() {
  const transactions = usePortfolioStore((state) => state.transactions);

  const uniqueTickers = [...new Set(
    transactions
      .filter(tx => tx.type === 'BUY')
      .map(tx => tx.ticker)
  )];

  return useRealtimePrices({
    tickers: uniqueTickers,
    enabled: uniqueTickers.length > 0,
  });
}