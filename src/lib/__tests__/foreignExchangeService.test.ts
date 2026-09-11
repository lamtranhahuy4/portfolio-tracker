import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getForexRates, snapshotDailyRates, getForexHistory } from '../foreignExchangeService';
import { setupFetchMock, type FetchMock } from '../../test/fetchMock';

vi.mock('@/lib/circuitBreaker', () => ({
  vietcombankCircuitBreaker: { execute: vi.fn((cb) => cb()) },
  frankfurterCircuitBreaker: { execute: vi.fn((cb) => cb()) },
}));

vi.mock('@/lib/goldPriceService', () => ({
  getGoldPrices: vi.fn().mockResolvedValue({ prices: [], updatedAt: '2023-01-01' }),
}));

vi.mock('@/db/index', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  }
}));

const VCB_XML = `
<ExrateList>
  <DateTime>9/11/2026 10:20:00 AM</DateTime>
  <Exrate CurrencyCode="USD" CurrencyName="DOLLAR" Buy="24,000" Transfer="24,010" Sell="24,300" />
  <Exrate CurrencyCode="EUR" CurrencyName="EURO" Buy="25,000" Transfer="25,100" Sell="26,000" />
</ExrateList>
`;

const FRANK_JSON = {
  amount: 1.0,
  base: "USD",
  date: "2026-09-11",
  rates: {
    EUR: 0.9,
    GBP: 0.8
  }
};

describe('foreignExchangeService', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = setupFetchMock();
    vi.clearAllMocks();
    
    // We mock fetch implementation because there are multiple fetch calls (VCB, Frankfurter)
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('vietcombank')) {
        return Promise.resolve(new Response(VCB_XML, { status: 200 }));
      }
      if (url.includes('frankfurter')) {
        return Promise.resolve(new Response(JSON.stringify(FRANK_JSON), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
  });

  it('getForexRates successfully fetches from VCB and Frankfurter', async () => {
    const data = await getForexRates();
    
    expect(data.vndPairs.rates.length).toBeGreaterThan(0);
    const usd = data.vndPairs.rates.find(r => r.code === 'USD');
    expect(usd?.buyCash).toBe(24000);
    expect(usd?.buyTransfer).toBe(24010);
    expect(usd?.sell).toBe(24300);

    expect(data.international.rates.length).toBeGreaterThan(0);
    const eur = data.international.rates.find((r) => r.currency === 'EUR');
    expect(eur?.rate).toBe(0.9);
  });

  it('getForexRates handles failures gracefully (fallback to empty)', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01').getTime());
    fetchMock.mockImplementation(() => Promise.reject(new Error('Network error')));
    
    const data = await getForexRates();
    expect(data.vndPairs.rates).toEqual([]);
    expect(data.international.rates).toEqual([]);
  });

  it('snapshotDailyRates saves data', async () => {
    const count = await snapshotDailyRates();
    expect(count).toBeGreaterThan(0);
  });
  
  it('getForexHistory fetches history from Frankfurter for non-VND', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('frankfurter')) {
        return Promise.resolve(new Response(JSON.stringify({
          rates: {
            "2026-09-10": { EUR: 0.89 },
            "2026-09-11": { EUR: 0.9 }
          }
        }), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    // We do a cache buster or test a different pair
    const history = await getForexHistory('USD', 'EUR', 2);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].rate).toBe(0.89);
  });
});
