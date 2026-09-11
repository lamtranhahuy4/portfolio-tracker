import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent } from '../formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('formats currency correctly with default params', () => {
      // 1000000 -> 1.000.000 ₫ (in vi-VN)
      const result = formatCurrency(1000000);
      expect(result).toBe(new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(1000000));
    });

    it('formats currency correctly with custom locale and currency', () => {
      const result = formatCurrency(1000, 'en-US', 'USD');
      expect(result).toBe(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(1000));
    });
  });

  describe('formatPercent', () => {
    it('formats percent correctly with default params', () => {
      // 15.5 -> 15,50%
      const result = formatPercent(15.5);
      expect(result).toBe(new Intl.NumberFormat('vi-VN', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0.155));
    });

    it('formats percent correctly with custom locale and fraction digits', () => {
      const result = formatPercent(15.5, 'en-US', 1);
      expect(result).toBe(new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(0.155));
    });
  });
});
