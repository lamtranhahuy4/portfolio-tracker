import { and, asc, between, eq, gte } from 'drizzle-orm';
import { db } from '@/db/index';
import { forexRatesHistory } from '@/db/schema';
import { getGoldPrices, GoldPriceItem } from '@/lib/goldPriceService';
import { vietcombankCircuitBreaker, frankfurterCircuitBreaker } from '@/lib/circuitBreaker';
import { withRetry } from '@/lib/retry';

const VIETCOMBANK_URL = 'https://portal.vietcombank.com.vn/UserControls/TVPortal.TyGia/pXML.aspx';
const FRANKFURTER_LATEST_URL = 'https://api.frankfurter.app/latest?from=USD';

// In-memory cache with 5-minute TTL
let ratesCache: { data: ForexResponse | null; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Cache for history queries (30-minute TTL)
let historyCache: { key: string; data: ForexHistoryPoint[]; expiresAt: number } | null = null;
const HISTORY_CACHE_TTL_MS = 30 * 60 * 1000;

export interface VcbRate {
  code: string;
  name: string;
  buyCash: number | null;
  buyTransfer: number | null;
  sell: number | null;
}

export interface InternationalRate {
  currency: string;
  rate: number;
}

export interface ForexResponse {
  vndPairs: {
    rates: VcbRate[];
    updatedAt: string;
  };
  international: {
    base: string;
    rates: InternationalRate[];
    updatedAt: string;
  };
  gold: {
    prices: GoldPriceItem[];
    updatedAt: string;
  };
}

export interface ForexHistoryPoint {
  date: string;
  rate: number;
}

function parseVcbValue(val: string | undefined): number | null {
  if (!val) return null;
  const num = parseFloat(val.replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

async function fetchVietcombankRates(): Promise<VcbRate[]> {
  try {
    const res = await vietcombankCircuitBreaker.execute(() =>
      withRetry(() => fetch(VIETCOMBANK_URL, {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }), { maxRetries: 1, baseDelayMs: 2000 })
    );
    if (!res.ok) return [];

    const xml = await res.text();
    const exrateRegex = /<Exrate\s+([^>]+)\/>/g;

    const relevantCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SGD', 'CNY', 'KRW', 'THB', 'HKD', 'MYR', 'NZD'];
    const results: VcbRate[] = [];
    const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;

    let exrateMatch: RegExpExecArray | null;
    while ((exrateMatch = exrateRegex.exec(xml)) !== null) {
      const attrsStr = exrateMatch[1];
      const attrs: Record<string, string> = {};
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      const code = attrs['CurrencyCode'];
      if (!code || !relevantCodes.includes(code)) continue;

      results.push({
        code,
        name: attrs['CurrencyName']?.trim() || `${code}/VND`,
        buyCash: parseVcbValue(attrs['Buy']),
        buyTransfer: parseVcbValue(attrs['Transfer']),
        sell: parseVcbValue(attrs['Sell']),
      });
    }

    return results;
  } catch {
    return [];
  }
}

async function fetchFrankfurterRates(): Promise<{ rates: Record<string, number>; date: string } | null> {
  try {
    const res = await frankfurterCircuitBreaker.execute(() =>
      withRetry(() => fetch(FRANKFURTER_LATEST_URL, {
        cache: 'no-store',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }), { maxRetries: 1, baseDelayMs: 2000 })
    );
    if (!res.ok) return null;

    const json = await res.json();
    return {
      rates: json.rates,
      date: json.date,
    };
  } catch {
    return null;
  }
}

const COMMON_PAIRS = [
  'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
  'SEK', 'NOK', 'DKK', 'HKD', 'SGD', 'CNY', 'KRW',
  'THB', 'INR', 'MXN', 'ZAR', 'TRY', 'BRL', 'TWD',
];

function computeInternationalRates(usdRates: Record<string, number>): InternationalRate[] {
  return COMMON_PAIRS
    .filter((currency) => usdRates[currency] !== undefined)
    .map((currency) => ({ currency, rate: usdRates[currency] }));
}

export async function getForexRates(): Promise<ForexResponse> {
  const now = Date.now();
  if (ratesCache && now < ratesCache.expiresAt && ratesCache.data) {
    return ratesCache.data;
  }

  const [vcbRates, frankfurter, gold] = await Promise.all([
    fetchVietcombankRates(),
    fetchFrankfurterRates(),
    getGoldPrices(),
  ]);

  const nowStr = new Date().toISOString();

  const international = frankfurter
    ? {
        base: 'USD',
        rates: computeInternationalRates(frankfurter.rates),
        updatedAt: frankfurter.date || nowStr,
      }
    : { base: 'USD', rates: [], updatedAt: nowStr };

  const data: ForexResponse = {
    vndPairs: {
      rates: vcbRates,
      updatedAt: nowStr,
    },
    international,
    gold,
  };

  ratesCache = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
}

/**
 * Save today's VCB rates as a snapshot to the DB.
 * Skips if already recorded for today.
 */
export async function snapshotDailyRates(): Promise<void> {
  const vcbRates = await fetchVietcombankRates();
  if (vcbRates.length === 0) return;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (const rate of vcbRates) {
    if (rate.sell === null && rate.buyTransfer === null) continue;

    const existing = await db
      .select()
      .from(forexRatesHistory)
      .where(
        and(
          eq(forexRatesHistory.targetCurrency, rate.code),
          eq(forexRatesHistory.baseCurrency, 'VND'),
          gte(forexRatesHistory.recordedAt, todayStart),
        )
      )
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(forexRatesHistory).values({
      baseCurrency: 'VND',
      targetCurrency: rate.code,
      rate: rate.sell !== null ? rate.sell.toString() : (rate.buyTransfer ?? rate.buyCash)?.toString() ?? '0',
      buyCash: rate.buyCash?.toString() ?? null,
      buyTransfer: rate.buyTransfer?.toString() ?? null,
      sell: rate.sell?.toString() ?? null,
      source: 'VIETCOMBANK',
    });
  }
}

/**
 * Get historical rates from the DB (for any pair).
 * Falls back to Frankfurter API for international pairs not in DB.
 */
export async function getForexHistory(
  from: string,
  to: string,
  days: number = 30
): Promise<ForexHistoryPoint[]> {
  const now = Date.now();
  const cacheKey = `${from}/${to}/${days}`;
  if (historyCache && historyCache.key === cacheKey && now < historyCache.expiresAt) {
    return [...historyCache.data];
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let result: ForexHistoryPoint[];

  // Try DB first (works for VND pairs from snapshots)
  if (from === 'VND' || to === 'VND') {
    const baseCurrency = from === 'VND' ? from : to;
    const targetCurrency = from === 'VND' ? to : from;

    const rows = await db
      .select()
      .from(forexRatesHistory)
      .where(
        and(
          eq(forexRatesHistory.baseCurrency, baseCurrency),
          eq(forexRatesHistory.targetCurrency, targetCurrency),
          between(forexRatesHistory.recordedAt, startDate, endDate),
        )
      )
      .orderBy(asc(forexRatesHistory.recordedAt));

    if (rows.length > 0) {
      result = rows.map((r) => ({
        date: r.recordedAt instanceof Date
          ? r.recordedAt.toISOString().split('T')[0]
          : new Date(r.recordedAt).toISOString().split('T')[0],
        rate: parseFloat(r.rate.toString()),
      }));
    } else {
      result = [];
    }
  } else {
    // For international pairs, try Frankfurter API (free, no key needed)
    try {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const frankUrl = `https://api.frankfurter.app/${startStr}..${endStr}?from=${from}&to=${to}`;
      const frankRes = await fetch(frankUrl, {
        cache: 'no-store',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (frankRes.ok) {
        const frankJson = await frankRes.json();
        const frankData = frankJson.rates as Record<string, Record<string, number>>;
        result = Object.entries(frankData)
          .map(([date, rates]) => ({ date, rate: rates[to] || 0 }))
          .filter((p) => p.rate > 0)
          .sort((a, b) => a.date.localeCompare(b.date));
      } else {
        result = [];
      }
    } catch {
      result = [];
    }
  }

  historyCache = { key: cacheKey, data: [...result], expiresAt: now + HISTORY_CACHE_TTL_MS };
  return result;
}
