import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useRealtimePrices } from '../useRealtimePrices';
import { usePortfolioStore } from '@/store/usePortfolioStore';

vi.mock('@/store/usePortfolioStore', () => ({
  usePortfolioStore: vi.fn(),
}));

let cleanupFns: (() => void)[] = [];

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useEffect: ((f: () => void | (() => void), _deps: any[]) => {
      const cleanup = f();
      if (cleanup) cleanupFns.push(cleanup);
    }) as typeof actual.useEffect,
    useState: vi.fn((init: any) => {
      const value = typeof init === 'function' ? init() : init;
      return [value, vi.fn()] as [any, any];
    }) as unknown as typeof actual.useState,
    useRef: ((init: any) => ({ current: init ?? null })) as typeof actual.useRef,
    useCallback: ((fn: any) => fn) as typeof actual.useCallback,
  };
});

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
}

vi.stubGlobal('EventSource', MockEventSource);

describe('useRealtimePrices', () => {
  const updatePriceMock = vi.fn();

  beforeEach(() => {
    MockEventSource.instances = [];
    cleanupFns = [];
    updatePriceMock.mockClear();
    vi.mocked(usePortfolioStore).mockImplementation((selector: any) => {
      const state = { updatePrice: updatePriceMock } as any;
      return selector(state);
    });
  });

  afterEach(() => {
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
  });

  it('should connect to SSE with tickers param', () => {
    useRealtimePrices({ tickers: ['HPG', 'FPT'], enabled: true });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toContain('/api/stream/prices');
    expect(MockEventSource.instances[0].url).toContain('HPG');
    expect(MockEventSource.instances[0].url).toContain('FPT');
  });

  it('should call updatePrice on message', () => {
    const priceUpdateSpy = vi.fn();
    useRealtimePrices({ tickers: ['HPG'], enabled: true, onPriceUpdate: priceUpdateSpy });

    MockEventSource.instances[0].onmessage!({
      data: JSON.stringify([{ ticker: 'HPG', price: 29000, timestamp: '2026-05-31T12:00:00Z' }]),
    });

    expect(updatePriceMock).toHaveBeenCalledWith('HPG', 29000);
    expect(priceUpdateSpy).toHaveBeenCalledWith({ ticker: 'HPG', price: 29000, timestamp: '2026-05-31T12:00:00Z' });
  });

  it('should not connect when disabled', () => {
    useRealtimePrices({ tickers: ['HPG'], enabled: false });

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('should close EventSource on cleanup', () => {
    useRealtimePrices({ tickers: ['HPG'], enabled: true });

    const closeSpy = MockEventSource.instances[0].close;
    cleanupFns.forEach((fn) => fn());

    expect(closeSpy).toHaveBeenCalled();
  });

  it('should return valid reconnect/disconnect functions', () => {
    const result = useRealtimePrices({ tickers: ['HPG'], enabled: true });

    expect(typeof result.reconnect).toBe('function');
    expect(typeof result.disconnect).toBe('function');
  });

  it('should handle null price gracefully', () => {
    useRealtimePrices({ tickers: ['HPG'], enabled: true });

    MockEventSource.instances[0].onmessage!({
      data: JSON.stringify([{ ticker: 'HPG', price: null, timestamp: '2026-05-31T12:00:00Z' }]),
    });

    expect(updatePriceMock).not.toHaveBeenCalled();
  });
});
