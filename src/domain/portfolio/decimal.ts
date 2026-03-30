import Decimal from 'decimal.js';

export type DecimalInput = Decimal.Value;

export const DECIMAL_ZERO = new Decimal(0);
export const DECIMAL_ONE = new Decimal(1);

export function toDecimal(value: DecimalInput) {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function decimalMin(left: DecimalInput, right: DecimalInput) {
  return Decimal.min(toDecimal(left), toDecimal(right));
}

export function decimalMax(left: DecimalInput, right: DecimalInput) {
  return Decimal.max(toDecimal(left), toDecimal(right));
}

export function decimalSum(values: DecimalInput[]) {
  return values.reduce<Decimal>((sum, value) => sum.plus(toDecimal(value)), DECIMAL_ZERO);
}

export function decimalToNumber(value: DecimalInput) {
  return toDecimal(value).toNumber();
}
