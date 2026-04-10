/**
 * Price Service - Market Data Infrastructure
 * 
 * Features:
 * - Cache prices in database for quick retrieval
 * - Freshness policy with configurable TTL
 * - Audit trail for all price changes
 * - Manual override capability
 */

import { and, eq, sql, desc, or, isNull } from 'drizzle-orm';
import { db } from '@/db/index';
import { marketPrices, priceHistory } from '@/db/schema';

export interface PriceData {
  ticker: string;
  assetClass: string;
  price: number;
  currency: string;
  source: string | null;
  fetchedAt: Date;
  isFresh: boolean;
  isStale: boolean;
  isManualOverride: boolean;
}

export interface PriceCacheConfig {
  stockTTLMinutes: number;
  cryptoTTLMinutes: number;
  forexTTLMinutes: number;
  goldTTLMinutes: number;
  defaultTTLMinutes: number;
}

export const DEFAULT_PRICE_CONFIG: PriceCacheConfig = {
  stockTTLMinutes: 5,      // 5 minutes for stocks (VN30, US markets)
  cryptoTTLMinutes: 1,     // 1 minute for crypto
  forexTTLMinutes: 60,    // 1 hour for forex
  goldTTLMinutes: 15,     // 15 minutes for gold
  defaultTTLMinutes: 15,
};

export function getTTLForAssetClass(
  assetClass: string,
  config: PriceCacheConfig = DEFAULT_PRICE_CONFIG
): number {
  switch (assetClass.toUpperCase()) {
    case 'STOCK':
      return config.stockTTLMinutes;
    case 'CRYPTO':
      return config.cryptoTTLMinutes;
    case 'FOREX':
      return config.forexTTLMinutes;
    case 'GOLD':
    case 'COMMODITY':
      return config.goldTTLMinutes;
    default:
      return config.defaultTTLMinutes;
  }
}

export function isPriceFresh(
  fetchedAt: Date,
  ttlMinutes: number
): boolean {
  const ttlMs = ttlMinutes * 60 * 1000;
  return Date.now() - fetchedAt.getTime() < ttlMs;
}

export function isPriceStale(
  fetchedAt: Date,
  ttlMinutes: number,
  maxStaleMultiplier = 3
): boolean {
  const ttlMs = ttlMinutes * 60 * 1000;
  const maxStaleMs = ttlMs * maxStaleMultiplier;
  return Date.now() - fetchedAt.getTime() > maxStaleMs;
}

export async function getCachedPrice(
  ticker: string
): Promise<PriceData | null> {
  const [cached] = await db
    .select()
    .from(marketPrices)
    .where(eq(marketPrices.ticker, ticker.toUpperCase()))
    .limit(1);

  if (!cached) {
    return null;
  }

  const ttlMinutes = getTTLForAssetClass(cached.assetClass ?? 'STOCK');
  const fetchedAt = new Date(cached.fetchedAt);
  
  const price = typeof cached.price === 'string' 
    ? parseFloat(cached.price) 
    : cached.price;

  return {
    ticker: cached.ticker,
    assetClass: cached.assetClass ?? 'STOCK',
    price,
    currency: cached.currency ?? 'VND',
    source: cached.source,
    fetchedAt,
    isFresh: isPriceFresh(fetchedAt, ttlMinutes),
    isStale: isPriceStale(fetchedAt, ttlMinutes),
    isManualOverride: cached.isManualOverride ?? false,
  };
}

export async function getCachedPrices(
  tickers: string[]
): Promise<Map<string, PriceData>> {
  if (tickers.length === 0) {
    return new Map();
  }

  const normalizedTickers = tickers.map(t => t.toUpperCase());
  
  const cached = await db
    .select()
    .from(marketPrices)
    .where(
      sql`upper(${marketPrices.ticker}) IN (${sql.join(
        normalizedTickers.map(t => sql`${t}`),
        sql`, `
      )})`
    );

  const result = new Map<string, PriceData>();
  
  for (const row of cached) {
    const ttlMinutes = getTTLForAssetClass(row.assetClass ?? 'STOCK');
    const fetchedAt = new Date(row.fetchedAt);
    
    const price = typeof row.price === 'string' 
      ? parseFloat(row.price) 
      : row.price;

    result.set(row.ticker, {
      ticker: row.ticker,
      assetClass: row.assetClass ?? 'STOCK',
      price,
      currency: row.currency ?? 'VND',
      source: row.source,
      fetchedAt,
      isFresh: isPriceFresh(fetchedAt, ttlMinutes),
      isStale: isPriceStale(fetchedAt, ttlMinutes),
      isManualOverride: row.isManualOverride ?? false,
    });
  }

  return result;
}

export async function cachePrice(
  ticker: string,
  price: number,
  assetClass: string = 'STOCK',
  currency: string = 'VND',
  source?: string
): Promise<PriceData> {
  const ttlMinutes = getTTLForAssetClass(assetClass);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const now = new Date();

  const [existing] = await db
    .select({ id: marketPrices.id })
    .from(marketPrices)
    .where(eq(marketPrices.ticker, ticker.toUpperCase()))
    .limit(1);

  if (existing) {
    await db
      .update(marketPrices)
      .set({
        price: price.toString(),
        assetClass,
        currency,
        source: source ?? null,
        fetchedAt: now,
        expiresAt,
        isManualOverride: false,
      })
      .where(eq(marketPrices.id, existing.id));
  } else {
    await db.insert(marketPrices).values({
      ticker: ticker.toUpperCase(),
      assetClass,
      price: price.toString(),
      currency,
      source: source ?? null,
      fetchedAt: now,
      expiresAt,
    });
  }

  await db.insert(priceHistory).values({
    ticker: ticker.toUpperCase(),
    assetClass,
    price: price.toString(),
    currency,
    source: source ?? null,
    recordedAt: now,
  });

  return {
    ticker: ticker.toUpperCase(),
    assetClass,
    price,
    currency,
    source: source ?? null,
    fetchedAt: now,
    isFresh: true,
    isStale: false,
    isManualOverride: false,
  };
}

export async function setManualPrice(
  ticker: string,
  price: number,
  assetClass: string = 'STOCK',
  currency: string = 'VND',
  reason?: string,
  userId?: string
): Promise<PriceData> {
  const now = new Date();
  const ttlMinutes = getTTLForAssetClass(assetClass) * 24;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const [existing] = await db
    .select({ id: marketPrices.id })
    .from(marketPrices)
    .where(eq(marketPrices.ticker, ticker.toUpperCase()))
    .limit(1);

  if (existing) {
    await db
      .update(marketPrices)
      .set({
        price: price.toString(),
        assetClass,
        currency,
        fetchedAt: now,
        expiresAt,
        isManualOverride: true,
      })
      .where(eq(marketPrices.id, existing.id));
  } else {
    await db.insert(marketPrices).values({
      ticker: ticker.toUpperCase(),
      assetClass,
      price: price.toString(),
      currency,
      fetchedAt: now,
      expiresAt,
      isManualOverride: true,
    });
  }

  await db.insert(priceHistory).values({
    ticker: ticker.toUpperCase(),
    assetClass,
    price: price.toString(),
    currency,
    recordedAt: now,
    recordedBy: userId ?? null,
    reason: reason ?? 'Manual override',
  });

  return {
    ticker: ticker.toUpperCase(),
    assetClass,
    price,
    currency,
    source: 'MANUAL',
    fetchedAt: now,
    isFresh: true,
    isStale: false,
    isManualOverride: true,
  };
}

export async function getPriceHistory(
  ticker: string,
  limit = 100
): Promise<Array<{
  price: number;
  currency: string;
  source: string | null;
  recordedAt: Date;
  recordedBy: string | null;
  reason: string | null;
}>> {
  const history = await db
    .select({
      price: priceHistory.price,
      currency: priceHistory.currency,
      source: priceHistory.source,
      recordedAt: priceHistory.recordedAt,
      recordedBy: priceHistory.recordedBy,
      reason: priceHistory.reason,
    })
    .from(priceHistory)
    .where(eq(priceHistory.ticker, ticker.toUpperCase()))
    .orderBy(desc(priceHistory.recordedAt))
    .limit(limit);

  return history.map(row => ({
    price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
    currency: row.currency ?? 'VND',
    source: row.source,
    recordedAt: new Date(row.recordedAt),
    recordedBy: row.recordedBy ?? null,
    reason: row.reason ?? null,
  }));
}

export async function cleanupExpiredPrices(): Promise<number> {
  const now = new Date();
  
  const result = await db
    .delete(marketPrices)
    .where(
      and(
        sql`${marketPrices.expiresAt} < ${now}`,
        or(
          sql`${marketPrices.isManualOverride} = false`,
          isNull(marketPrices.isManualOverride)
        )
      )
    );

  return result.rowCount ?? 0;
}

export async function getStalePricesCount(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(marketPrices)
    .where(
      and(
        sql`${marketPrices.expiresAt} < NOW()`,
        sql`${marketPrices.isManualOverride} = false`
      )
    );

  return Number(result[0]?.count ?? 0);
}

export async function getFreshnessStats(): Promise<{
  total: number;
  fresh: number;
  stale: number;
  manual: number;
}> {
  const prices = await db.select().from(marketPrices);
  
  let fresh = 0;
  let stale = 0;
  let manual = 0;

  for (const price of prices) {
    if (price.isManualOverride) {
      manual++;
      continue;
    }

    const ttlMinutes = getTTLForAssetClass(price.assetClass ?? 'STOCK');
    const fetchedAt = new Date(price.fetchedAt);
    
    if (isPriceFresh(fetchedAt, ttlMinutes)) {
      fresh++;
    } else if (isPriceStale(fetchedAt, ttlMinutes)) {
      stale++;
    } else {
      fresh++;
    }
  }

  return {
    total: prices.length,
    fresh,
    stale,
    manual,
  };
}
