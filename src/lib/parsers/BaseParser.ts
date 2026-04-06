/**
 * Shared text/number parsing utilities used by all parser implementations.
 * Exported so each concrete parser can import only what it needs.
 * 
 * Decimal.js Integration: Financial values are parsed using Decimal.js to avoid
 * floating-point precision issues (e.g., 0.1 + 0.2 = 0.30000000000000004).
 * The engine (portfolioMetrics.ts) uses Decimal internally for all calculations.
 */
import Decimal, { type Decimal as DecimalType } from 'decimal.js';
import { AssetClass, ImportWarning, NormalizedTransaction, TransactionType } from '@/types/portfolio';
import { toMoney, toPrice, toQuantity } from '@/domain/portfolio/primitives';

// ─── Text helpers ─────────────────────────────────────────────────────────────

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function toTicker(value: string, assetClass: AssetClass): string {
  if (assetClass === 'CASH') return 'CASH_VND';
  return value.trim().toUpperCase();
}

// ─── Number / Date helpers ───────────────────────────────────────────────────

export function parseNumber(value: unknown): number {
  if (value === null || value === undefined) return NaN;
  const raw = String(value).trim();
  if (!raw) return NaN;
  const normalized = raw
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '');
  return Number(normalized);
}

/**
 * Parse a value to Decimal for precise financial calculations.
 * This avoids floating-point precision issues inherent in JavaScript numbers.
 * 
 * Uses Decimal.js configuration: precision 20, rounding HALF_UP
 * 
 * @example
 * parseNumberToDecimal('0.1').plus('0.2').toString() // "0.3" (not "0.30000000000000004")
 */
export function parseNumberToDecimal(value: unknown): DecimalType {
  if (value === null || value === undefined) {
    return new Decimal(NaN);
  }
  const raw = String(value).trim();
  if (!raw) {
    return new Decimal(NaN);
  }
  const normalized = raw
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '');
  
  try {
    return new Decimal(normalized);
  } catch {
    return new Decimal(NaN);
  }
}

/**
 * Check if a Decimal value is a valid number (not NaN or Infinity).
 */
export function isValidDecimal(value: DecimalType): boolean {
  return value.isFinite() && !value.isNaN();
}

/**
 * Convert a Decimal to a safe number for boundary display/UI.
 * Prefer working with Decimal throughout calculations.
 */
export function decimalToNumber(value: DecimalType): number {
  return value.toNumber();
}

export function parseViDate(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const parts = raw.split(/[/-]/);
  if (parts.length >= 3) {
    const [day, month, year] = parts;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// ─── Transaction helpers ─────────────────────────────────────────────────────

export function parseTransactionType(value: unknown): TransactionType | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized === 'b' || normalized.includes('mua') || normalized.includes('buy')) return 'BUY';
  if (normalized === 's' || normalized.includes('ban') || normalized.includes('sell')) return 'SELL';
  if (normalized.includes('co tuc bang tien') || normalized.includes('dividend')) return 'DIVIDEND';
  if (normalized.includes('co tuc bang co phieu') || normalized.includes('stock dividend')) return 'STOCK_DIVIDEND';
  if (normalized.includes('nop') || normalized.includes('deposit')) return 'DEPOSIT';
  if (normalized.includes('rut') || normalized.includes('withdraw')) return 'WITHDRAW';
  if (normalized.includes('lai') || normalized.includes('interest')) return 'INTEREST';
  return null;
}

export function getAssetClass(type: TransactionType): AssetClass {
  return ['DEPOSIT', 'WITHDRAW', 'INTEREST'].includes(type) ? 'CASH' : 'STOCK';
}

export function resolveColumn(row: Record<string, unknown>, aliases: string[]): unknown {
  const keys = Object.keys(row);
  const aliasSet = aliases.map(normalizeText);
  const key = keys.find((candidate) => aliasSet.includes(normalizeText(candidate)));
  return key ? row[key] : undefined;
}

export function buildTransaction(input: {
  row: number;
  ticker: string;
  type: TransactionType;
  quantity: DecimalType | number;
  price: DecimalType | number;
  fee?: DecimalType | number;
  tax?: DecimalType | number;
  date: Date;
  notes?: string;
  source: string;
}): NormalizedTransaction {
  const assetClass = getAssetClass(input.type);
  const qty = parseNumberToDecimal(input.quantity);
  const px = parseNumberToDecimal(input.price);
  const feeVal = parseNumberToDecimal(input.fee ?? 0);
  const taxVal = parseNumberToDecimal(input.tax ?? 0);
  
  const grossValue = qty.times(px);
  const totalValue = input.type === 'SELL'
    ? grossValue.minus(feeVal).minus(taxVal)
    : grossValue.plus(feeVal).plus(taxVal);

  return {
    id: crypto.randomUUID(),
    date: input.date,
    assetClass,
    ticker: toTicker(input.ticker, assetClass),
    type: input.type,
    quantity: toQuantity(qty),
    price: toPrice(px),
    fee: toMoney(feeVal),
    tax: toMoney(taxVal),
    totalValue: toMoney(totalValue),
    notes: input.notes,
    source: input.source,
  };
}

export function makeWarningPusher(
  warnings: ImportWarning[],
  rowNumber: number,
  context: { rawType?: string; rawTicker?: string; rawQuantity?: string; rawPrice?: string; rawDate?: string }
) {
  return (message: string) => {
    warnings.push({ row: rowNumber, message, ...context });
  };
}
