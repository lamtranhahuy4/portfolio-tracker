import { describe, expect, it } from 'vitest';
import {
  normalizeText,
  parseNumber,
  parseViDate,
  parseTransactionType,
  getAssetClass,
} from '../parsers/BaseParser';

describe('BaseParser - Pure Functions', () => {
  describe('normalizeText', () => {
    it('should handle null/undefined', () => {
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
    });

    it('should remove diacritics', () => {
      expect(normalizeText('Hà Nội')).toBe('ha noi');
    });

    it('should collapse whitespace', () => {
      expect(normalizeText('hello    world')).toBe('hello world');
    });

    it('should convert to lowercase', () => {
      expect(normalizeText('Hello World')).toBe('hello world');
    });
  });

  describe('parseNumber', () => {
    it('should handle null/undefined', () => {
      expect(Number.isNaN(parseNumber(null))).toBe(true);
      expect(Number.isNaN(parseNumber(undefined))).toBe(true);
    });

    it('should handle empty string', () => {
      expect(Number.isNaN(parseNumber(''))).toBe(true);
    });

    it('should parse plain numbers', () => {
      expect(parseNumber(12345)).toBe(12345);
      expect(parseNumber('12345')).toBe(12345);
    });

    it('should handle negative numbers', () => {
      expect(parseNumber('-100000')).toBe(-100000);
    });
  });

  describe('parseViDate', () => {
    it('should handle null/undefined', () => {
      expect(parseViDate(null)).toBeNull();
      expect(parseViDate(undefined)).toBeNull();
    });

    it('should parse DD/MM/YYYY format', () => {
      const result = parseViDate('15/03/2024');
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(2);
    });

    it('should parse ISO format', () => {
      const result = parseViDate('2024-06-15');
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should return null for invalid dates', () => {
      expect(parseViDate('invalid')).toBeNull();
    });
  });

  describe('parseTransactionType', () => {
    it('should handle null/undefined', () => {
      expect(parseTransactionType(null)).toBeNull();
    });

    it('should parse BUY variants', () => {
      expect(parseTransactionType('B')).toBe('BUY');
      expect(parseTransactionType('buy')).toBe('BUY');
      expect(parseTransactionType('mua')).toBe('BUY');
    });

    it('should parse SELL variants', () => {
      expect(parseTransactionType('S')).toBe('SELL');
      expect(parseTransactionType('sell')).toBe('SELL');
      expect(parseTransactionType('ban')).toBe('SELL');
    });

    it('should parse DIVIDEND', () => {
      expect(parseTransactionType('dividend')).toBe('DIVIDEND');
    });

    it('should parse DEPOSIT', () => {
      expect(parseTransactionType('deposit')).toBe('DEPOSIT');
    });

    it('should parse WITHDRAW', () => {
      expect(parseTransactionType('withdraw')).toBe('WITHDRAW');
    });

    it('should parse INTEREST', () => {
      expect(parseTransactionType('interest')).toBe('INTEREST');
    });

    it('should return null for unknown types', () => {
      expect(parseTransactionType('unknown')).toBeNull();
    });
  });

  describe('getAssetClass', () => {
    it('should return CASH for DEPOSIT', () => {
      expect(getAssetClass('DEPOSIT')).toBe('CASH');
    });

    it('should return CASH for WITHDRAW', () => {
      expect(getAssetClass('WITHDRAW')).toBe('CASH');
    });

    it('should return CASH for INTEREST', () => {
      expect(getAssetClass('INTEREST')).toBe('CASH');
    });

    it('should return STOCK for BUY', () => {
      expect(getAssetClass('BUY')).toBe('STOCK');
    });

    it('should return STOCK for SELL', () => {
      expect(getAssetClass('SELL')).toBe('STOCK');
    });
  });
});
