import { describe, expect, it, vi, beforeEach } from 'vitest';
import { vi as vitest } from 'vitest';

vi.mock('@/db/index', () => {
  const chainable = {
    execute: vitest.fn().mockResolvedValue({ rows: [{ '1': 1 }] }),
    select: vitest.fn().mockImplementation(() => chainable),
    insert: vitest.fn().mockImplementation(() => chainable),
    update: vitest.fn().mockImplementation(() => chainable),
    delete: vitest.fn().mockImplementation(() => chainable),
    from: vitest.fn().mockImplementation(() => chainable),
    where: vitest.fn().mockImplementation(() => chainable),
    values: vitest.fn().mockImplementation(() => chainable),
    set: vitest.fn().mockImplementation(() => chainable),
    limit: vitest.fn().mockImplementation(() => chainable),
    orderBy: vitest.fn().mockImplementation(() => chainable),
    onConflictDoUpdate: vitest.fn().mockImplementation(() => chainable),
    then: function(resolve: (value: never[]) => void) { resolve([]); }
  };
  return { db: chainable };
});

import {
  getTTLForAssetClass,
  isPriceFresh,
  isPriceStale,
  DEFAULT_PRICE_CONFIG,
} from '@/lib/priceService';

describe('Price Service - TTL Configuration', () => {
  describe('getTTLForAssetClass', () => {
    it('should return 5 minutes for STOCK', () => {
      expect(getTTLForAssetClass('STOCK')).toBe(5);
    });

    it('should return 1 minute for CRYPTO', () => {
      expect(getTTLForAssetClass('CRYPTO')).toBe(1);
    });

    it('should return 15 minutes for GOLD', () => {
      expect(getTTLForAssetClass('GOLD')).toBe(15);
    });

    it('should return 60 minutes for FOREX', () => {
      expect(getTTLForAssetClass('FOREX')).toBe(60);
    });

    it('should return default TTL for unknown asset class', () => {
      expect(getTTLForAssetClass('UNKNOWN')).toBe(DEFAULT_PRICE_CONFIG.defaultTTLMinutes);
    });

    it('should be case insensitive', () => {
      expect(getTTLForAssetClass('stock')).toBe(5);
      expect(getTTLForAssetClass('Stock')).toBe(5);
      expect(getTTLForAssetClass('CRYPTO')).toBe(1);
    });
  });

  describe('isPriceFresh', () => {
    it('should return true for price fetched within TTL', () => {
      const fiveMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
      expect(isPriceFresh(fiveMinutesAgo, 5)).toBe(true);
    });

    it('should return false for price fetched beyond TTL', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      expect(isPriceFresh(tenMinutesAgo, 5)).toBe(false);
    });

    it('should return true for price fetched just now', () => {
      const now = new Date();
      expect(isPriceFresh(now, 5)).toBe(true);
    });
  });

  describe('isPriceStale', () => {
    it('should return false for fresh price', () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      expect(isPriceStale(twoMinutesAgo, 5)).toBe(false);
    });

    it('should return true for price older than 3x TTL', () => {
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
      expect(isPriceStale(twentyMinutesAgo, 5)).toBe(true);
    });

    it('should return false for price between TTL and 3x TTL', () => {
      const twelveMinutesAgo = new Date(Date.now() - 12 * 60 * 1000);
      expect(isPriceStale(twelveMinutesAgo, 5)).toBe(false);
    });
  });

  describe('DEFAULT_PRICE_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_PRICE_CONFIG.stockTTLMinutes).toBe(5);
      expect(DEFAULT_PRICE_CONFIG.cryptoTTLMinutes).toBe(1);
      expect(DEFAULT_PRICE_CONFIG.forexTTLMinutes).toBe(60);
      expect(DEFAULT_PRICE_CONFIG.goldTTLMinutes).toBe(15);
      expect(DEFAULT_PRICE_CONFIG.defaultTTLMinutes).toBe(15);
    });
  });
});

import { db } from '@/db/index';
import type { Mock } from 'vitest';
import {
  getCachedPrice,
  getCachedPrices,
  cachePrice,
  setManualPrice,
  getPriceHistory,
  cleanupExpiredPrices,
  getStalePricesCount,
  getFreshnessStats
} from '@/lib/priceService';

interface DbChainableMock {
  limit: Mock;
  where: Mock;
  from: Mock;
  onConflictDoUpdate: Mock;
}
const mockDb = db as unknown as DbChainableMock;

describe('Price Service - Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCachedPrice', () => {
    it('should return null if no price is found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      const result = await getCachedPrice('HPG');
      expect(result).toBeNull();
    });

    it('should return formatted price data if found', async () => {
      const mockDate = new Date();
      mockDb.limit.mockResolvedValueOnce([{
        ticker: 'HPG',
        assetClass: 'STOCK',
        price: '35000',
        currency: 'VND',
        source: 'TEST',
        fetchedAt: mockDate,
        isManualOverride: false
      }]);
      
      const result = await getCachedPrice('HPG');
      expect(result).not.toBeNull();
      expect(result?.ticker).toBe('HPG');
      expect(result?.price).toBe(35000);
      expect(result?.isFresh).toBe(true); // assuming mockDate is fresh
    });
  });

  describe('getCachedPrices', () => {
    it('should return empty map for empty array', async () => {
      const result = await getCachedPrices([]);
      expect(result.size).toBe(0);
    });

    it('should return mapped prices', async () => {
      const mockDate = new Date();
      mockDb.where.mockResolvedValueOnce([{
        ticker: 'HPG',
        assetClass: 'STOCK',
        price: '35000',
        currency: 'VND',
        source: 'TEST',
        fetchedAt: mockDate,
        isManualOverride: false
      }]);
      
      const result = await getCachedPrices(['HPG']);
      expect(result.get('HPG')?.price).toBe(35000);
    });
  });

  describe('cachePrice', () => {
    it('should cache price and history', async () => {
      mockDb.onConflictDoUpdate.mockResolvedValueOnce({});
      
      const result = await cachePrice('HPG', 35000, 'STOCK', 'VND', 'MOCK');
      expect(result.ticker).toBe('HPG');
      expect(result.price).toBe(35000);
      expect(result.isFresh).toBe(true);
      expect(db.insert).toHaveBeenCalledTimes(2); // One for marketPrices, one for priceHistory
    });
  });

  describe('setManualPrice', () => {
    it('should set manual price override', async () => {
      mockDb.onConflictDoUpdate.mockResolvedValueOnce({});
      
      const result = await setManualPrice('HPG', 36000, 'STOCK', 'VND', 'Manual check', 'user1');
      expect(result.ticker).toBe('HPG');
      expect(result.price).toBe(36000);
      expect(result.isManualOverride).toBe(true);
    });
  });

  describe('getPriceHistory', () => {
    it('should return formatted history', async () => {
      const mockDate = new Date();
      mockDb.limit.mockResolvedValueOnce([{
        price: '35000',
        currency: 'VND',
        source: 'TEST',
        recordedAt: mockDate,
        recordedBy: 'user1',
        reason: 'test'
      }]);
      
      const result = await getPriceHistory('HPG');
      expect(result.length).toBe(1);
      expect(result[0].price).toBe(35000);
      expect(result[0].recordedBy).toBe('user1');
    });
  });

  describe('cleanupExpiredPrices', () => {
    it('should delete expired prices and return count', async () => {
      mockDb.where.mockResolvedValueOnce({ rowCount: 5 });
      const count = await cleanupExpiredPrices();
      expect(count).toBe(5);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('getStalePricesCount', () => {
    it('should return stale count', async () => {
      mockDb.where.mockResolvedValueOnce([{ count: 10 }]);
      const count = await getStalePricesCount();
      expect(count).toBe(10);
    });
  });

  describe('getFreshnessStats', () => {
    it('should calculate freshness stats', async () => {
      const freshDate = new Date();
      const staleDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      
      mockDb.from.mockResolvedValueOnce([
        { assetClass: 'STOCK', fetchedAt: freshDate, isManualOverride: false },
        { assetClass: 'STOCK', fetchedAt: staleDate, isManualOverride: false },
        { assetClass: 'STOCK', fetchedAt: freshDate, isManualOverride: true },
      ]);
      
      const stats = await getFreshnessStats();
      expect(stats.total).toBe(3);
      expect(stats.fresh).toBe(1);
      expect(stats.stale).toBe(1);
      expect(stats.manual).toBe(1);
    });
  });
});
