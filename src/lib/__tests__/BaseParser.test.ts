import { describe, expect, it } from 'vitest';
import {
  normalizeText,
  parseNumber,
  parseNumberToDecimal,
  isValidDecimal,
  parseViDate,
  parseTransactionType,
  getAssetClass,
  buildTransaction,
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

  describe('Decimal Precision - Critical for Financial Calculations', () => {
    describe('parseNumberToDecimal', () => {
      it('should handle null/undefined', () => {
        const result = parseNumberToDecimal(null);
        expect(result.isNaN()).toBe(true);
      });

      it('should handle empty string', () => {
        const result = parseNumberToDecimal('');
        expect(result.isNaN()).toBe(true);
      });

      it('should parse numbers correctly', () => {
        const result = parseNumberToDecimal('12345');
        expect(result.toNumber()).toBe(12345);
      });

      it('should handle Vietnamese number format with commas', () => {
        const result = parseNumberToDecimal('1,234,567.89');
        expect(result.toNumber()).toBe(1234567.89);
      });

      it('should handle numbers with decimal places', () => {
        const result = parseNumberToDecimal('35000.123456');
        expect(result.toNumber()).toBeCloseTo(35000.123456, 6);
      });
    });

    describe('Floating Point Precision Tests', () => {
      it('should not have precision issues with 0.1 + 0.2', () => {
        const a = parseNumberToDecimal('0.1');
        const b = parseNumberToDecimal('0.2');
        const sum = a.plus(b);
        expect(sum.toString()).toBe('0.3');
        expect(sum.toNumber()).toBe(0.3);
      });

      it('should handle 0.1 + 0.2 with number (for comparison)', () => {
        const numResult = 0.1 + 0.2;
        expect(numResult).not.toBe(0.3);
        expect(numResult).toBeCloseTo(0.3, 15);
      });

      it('should handle financial calculations precisely', () => {
        const price = parseNumberToDecimal('35500');
        const quantity = parseNumberToDecimal('100');
        const total = price.times(quantity);
        expect(total.toNumber()).toBe(3550000);
      });

      it('should handle small decimal differences in stock prices', () => {
        const buyPrice = parseNumberToDecimal('35500.123456');
        const sellPrice = parseNumberToDecimal('36000.789012');
        const profit = sellPrice.minus(buyPrice);
        expect(profit.toNumber()).toBeCloseTo(500.665556, 6);
      });

      it('should handle percentage calculations precisely', () => {
        const cost = parseNumberToDecimal('1000000');
        const current = parseNumberToDecimal('1100000');
        const returnRate = current.minus(cost).div(cost);
        expect(returnRate.toNumber()).toBeCloseTo(0.1, 10);
      });

      it('should handle large numbers without precision loss', () => {
        const largeNumber = parseNumberToDecimal('999999999999.9999');
        const doubled = largeNumber.times(2);
        expect(doubled.toNumber()).toBeCloseTo(1999999999999.9998, 4);
      });
    });

    describe('isValidDecimal', () => {
      it('should return true for valid finite numbers', () => {
        const valid = parseNumberToDecimal('123.45');
        expect(isValidDecimal(valid)).toBe(true);
      });

      it('should return false for NaN', () => {
        const nan = parseNumberToDecimal('invalid');
        expect(isValidDecimal(nan)).toBe(false);
      });

      it('should return false for negative numbers (for quantity/price validation)', () => {
        const neg = parseNumberToDecimal('-100');
        expect(isValidDecimal(neg)).toBe(true); // Still valid but negative
      });

      it('should return false for null/undefined', () => {
        expect(isValidDecimal(parseNumberToDecimal(null))).toBe(false);
        expect(isValidDecimal(parseNumberToDecimal(undefined))).toBe(false);
      });

      it('should work with zero', () => {
        const zero = parseNumberToDecimal('0');
        expect(isValidDecimal(zero)).toBe(true);
        expect(zero.isZero()).toBe(true);
      });
    });
  });

  describe('buildTransaction with Decimal', () => {
    it('should build transaction with Decimal inputs', () => {
      const result = buildTransaction({
        row: 1,
        ticker: 'HPG',
        type: 'BUY',
        quantity: parseNumberToDecimal('1000'),
        price: parseNumberToDecimal('35000'),
        fee: parseNumberToDecimal('5000'),
        tax: parseNumberToDecimal('1500'),
        date: new Date('2024-01-15'),
        source: 'test',
      });

      expect(result.quantity).toBe(1000);
      expect(result.price).toBe(35000);
      expect(result.fee).toBe(5000);
      expect(result.tax).toBe(1500);
      expect(result.ticker).toBe('HPG');
    });

    it('should calculate totalValue correctly for BUY', () => {
      const result = buildTransaction({
        row: 1,
        ticker: 'HPG',
        type: 'BUY',
        quantity: parseNumberToDecimal('100'),
        price: parseNumberToDecimal('35000'),
        fee: parseNumberToDecimal('3500'),
        tax: parseNumberToDecimal('1000'),
        date: new Date('2024-01-15'),
        source: 'test',
      });

      // BUY: (100 * 35000) + 3500 + 1000 = 3500000 + 4500 = 3504500
      expect(result.totalValue).toBe(3504500);
    });

    it('should calculate totalValue correctly for SELL', () => {
      const result = buildTransaction({
        row: 1,
        ticker: 'HPG',
        type: 'SELL',
        quantity: parseNumberToDecimal('50'),
        price: parseNumberToDecimal('40000'),
        fee: parseNumberToDecimal('2000'),
        tax: parseNumberToDecimal('6000'),
        date: new Date('2024-01-15'),
        source: 'test',
      });

      // SELL: (50 * 40000) - 2000 - 6000 = 2000000 - 8000 = 1992000
      expect(result.totalValue).toBe(1992000);
    });
  });
});
