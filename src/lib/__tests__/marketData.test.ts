import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRealtimeQuotes, getHistoricalPrices, getMarketIndices, getTrendingAssets } from '../marketData';
import { setupFetchMock } from '../../test/fetchMock';

vi.mock('@/lib/circuitBreaker', () => ({
  dnseCircuitBreaker: { execute: vi.fn((cb) => cb()) },
  yahooCircuitBreaker: { execute: vi.fn((cb) => cb()) },
  coinGeckoCircuitBreaker: { execute: vi.fn((cb) => cb()) },
  vangTodayCircuitBreaker: { execute: vi.fn((cb) => cb()) },
}));

const DNSE_SERIES_JSON = {
  t: [1700000000, 1700086400],
  c: [20.5, 21.0]
};

describe('marketData', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = setupFetchMock();
    vi.clearAllMocks();
    
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('entrade.com.vn')) {
        return Promise.resolve(new Response(JSON.stringify(DNSE_SERIES_JSON), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
  });

  it('getRealtimeQuotes fetches stock quotes for multiple symbols', async () => {
    const quotes = await getRealtimeQuotes(['SSI', 'VND']);
    
    expect(quotes['SSI']).toBe(21000); // 21.0 * 1000
    expect(quotes['VND']).toBe(21000);
  });

  it('getHistoricalPrices fetches history', async () => {
    const history = await getHistoricalPrices(['SSI']);
    
    expect(history['SSI']).toBeDefined();
    // check keys in history['SSI']
    const keys = Object.keys(history['SSI']);
    expect(keys.length).toBeGreaterThan(0);
    expect(history['SSI'][keys[0]]).toBe(20500); // 20.5 * 1000
  });

  it('getMarketIndices returns indices successfully', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('entrade.com.vn')) {
        return Promise.resolve(new Response(JSON.stringify(DNSE_SERIES_JSON), { status: 200 }));
      }
      if (url.includes('yahoo')) {
        return Promise.resolve(new Response(JSON.stringify({
          chart: { result: [{ meta: { regularMarketPrice: 1250.5, previousClose: 1240.0 } }] }
        }), { status: 200 }));
      }
      if (url.includes('coingecko')) {
        return Promise.resolve(new Response(JSON.stringify({
          bitcoin: { usd: 60000, usd_24h_change: 1.5 },
          ethereum: { usd: 3000, usd_24h_change: 2.0 }
        }), { status: 200 }));
      }
      if (url.includes('vang.today')) {
        return Promise.resolve(new Response(JSON.stringify({
          success: true, buy: 80000000, sell: 82000000, change_buy: 100000, change_sell: 100000
        }), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    const indices = await getMarketIndices();
    expect(indices.length).toBeGreaterThan(0);
    
    const vnindex = indices.find(i => i.name === 'VN-INDEX');
    expect(vnindex).toBeDefined();
    expect(vnindex?.price).toBe('1,250.5');

    const btc = indices.find(i => i.name === 'BITCOIN');
    expect(btc).toBeDefined();
    expect(btc?.price).toBe('60,000');
  });
});
