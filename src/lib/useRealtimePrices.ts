'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
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

  const connectRef = useRef<() => void>(() => {});
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
          connectRef.current();
        }
      }, 5000);
    };
  }, [tickers, enabled, updatePrice, onPriceUpdate]);

  // Sync connectRef to the latest connect callback after every render.
  // useLayoutEffect runs synchronously after DOM mutations, before paint —
  // safe to write refs here without violating React render-purity rules.
  useLayoutEffect(() => {
    connectRef.current = connect;
  });

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

  const tickersKey = tickers.join(',');

  useEffect(() => {
    if (enabled && tickersKey.length > 0) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [tickersKey, enabled, connect, disconnect]);

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