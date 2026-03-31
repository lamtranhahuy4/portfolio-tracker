import { DecimalInput, decimalToNumber } from './decimal';

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
