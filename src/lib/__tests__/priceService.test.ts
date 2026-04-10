import { describe, expect, it, vi } from 'vitest';
import { vi as vitest } from 'vitest';

vi.mock('@/db/index', () => ({
  db: {
    execute: vitest.fn().mockResolvedValue({ rows: [{ '1': 1 }] }),
    select: vitest.fn().mockReturnThis(),
    insert: vitest.fn().mockReturnThis(),
    update: vitest.fn().mockReturnThis(),
    delete: vitest.fn().mockReturnThis(),
    from: vitest.fn().mockReturnThis(),
    where: vitest.fn().mockReturnThis(),
    values: vitest.fn().mockResolvedValue({}),
    set: vitest.fn().mockReturnThis(),
    limit: vitest.fn().mockResolvedValue([]),
    orderBy: vitest.fn().mockResolvedValue([]),
  },
}));

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
