/**
 * Branded primitive types for financial values.
 * 
 * These types are aliases for `number` but provide semantic meaning
 * and help prevent mixing up different types of financial values.
 * 
 * IMPORTANT: These are boundary functions that convert Decimal values
 * to numbers for UI/JSON serialization. The engine internally uses
 * Decimal.js for all calculations to avoid floating-point precision issues.
 * 
 * Architecture:
 * 
 *   Parser Layer (Decimal parsing)
 *         ↓
 *   Engine Layer (Decimal calculations) ← portfolioMetrics.ts uses Decimal internally
 *         ↓
 *   Boundary Functions (toMoney, toQuantity, toPrice) ← convert to number for UI
 *         ↓
 *   UI/JSON Layer (number values)
 */
import { DecimalInput, decimalToNumber } from './decimal';

// Re-export for use in parsers and other modules
export type { DecimalInput };
export { decimalToNumber } from './decimal';

declare const brandUnit: unique symbol;

export type Money = number & { readonly [brandUnit]: 'Money' };
export type Quantity = number & { readonly [brandUnit]: 'Quantity' };
export type Price = number & { readonly [brandUnit]: 'Price' };

export function toMoney(val: number | DecimalInput | null | undefined): Money {
  if (val === null || val === undefined) return 0 as Money;
  return decimalToNumber(val) as Money;
}

export function toQuantity(val: number | DecimalInput | null | undefined): Quantity {
  if (val === null || val === undefined) return 0 as Quantity;
  return decimalToNumber(val) as Quantity;
}

export function toPrice(val: number | DecimalInput | null | undefined): Price {
  if (val === null || val === undefined) return 0 as Price;
  return decimalToNumber(val) as Price;
}
