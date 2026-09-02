'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export interface RealtimePriceUpdate {
  ticker: string;
  price: number | null;
  timestamp: string;
}

export interface UseRealtimePricesOptions {
  enabled?: boolean;
  tickers: string[];
  onPriceUpdate?: (update: RealtimePriceUpdate) => void;
}

export interface UseRealtimePricesReturn {
  isConnected: boolean;
  lastUpdate: Date | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useRealtimePrices({
  tickers,
  enabled = true,
  onPriceUpdate,
}: UseRealtimePricesOptions): UseRealtimePricesReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});
  
  // Stabilize onPriceUpdate callback reference to prevent recreation of connect()
  const onPriceUpdateRef = useRef(onPriceUpdate);
  useLayoutEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
  });

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const tickersKey = useMemo(() => {
    return [...new Set(tickers.map(t => t.trim().toUpperCase()))].sort().join(',');
  }, [tickers]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    clearReconnectTimer();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const tickerList = tickersKey.split(',').filter(Boolean);
    if (!enabled || tickerList.length === 0) {
      setIsConnected(false);
      return;
    }

    const url = `/api/stream/prices?tickers=${encodeURIComponent(tickersKey)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const updates: RealtimePriceUpdate[] = JSON.parse(event.data);
        const batch: Record<string, number> = {};
        
        updates.forEach((update) => {
          if (
            update.ticker &&
            typeof update.price === 'number' &&
            Number.isFinite(update.price) &&
            update.price >= 0
          ) {
            batch[update.ticker.toUpperCase()] = update.price;
            onPriceUpdateRef.current?.(update);
          }
        });
        
        if (Object.keys(batch).length > 0) {
          usePortfolioStore.getState().updatePricesBatch(batch);
        }
        
        setLastUpdate(new Date());
      } catch {
        console.error('[SSE] Failed to parse price update');
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        if (enabled && tickersKey.length > 0) {
          connectRef.current();
        }
      }, 5000);
    };
  }, [tickersKey, enabled, clearReconnectTimer]);

  useLayoutEffect(() => {
    connectRef.current = connect;
  });

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

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

export function useHoldingsRealtimePrices(isMounted: boolean = true) {
  const transactions = usePortfolioStore((state) => state.transactions);
  const openingPositions = usePortfolioStore((state) => state.openingPositions);

  const uniqueTickers = [...new Set([
    ...transactions.filter(tx => tx.type === 'BUY').map(tx => tx.ticker),
    ...openingPositions.map(pos => pos.ticker)
  ])];

  return useRealtimePrices({
    tickers: uniqueTickers,
    enabled: isMounted && uniqueTickers.length > 0,
  });
}
