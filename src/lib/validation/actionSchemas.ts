import { z } from 'zod';
import { AppError } from '@/lib/errorHandler';
import type { AssetClass, CashLedgerEventType, TransactionType } from '@/types/portfolio';

/**
 * Runtime validation for Server Action inputs.
 *
 * Server Actions are public HTTP endpoints: TypeScript types do not protect them,
 * so every write action must parse its arguments with these schemas before touching the DB.
 */

// numeric(18, 4) columns overflow at 1e14
const MAX_ABS_VALUE = 1e14;
export const MAX_BATCH_ROWS = 20_000;
export const MAX_OPENING_POSITIONS = 1_000;

const finiteNumber = z.number().finite().gt(-MAX_ABS_VALUE).lt(MAX_ABS_VALUE);
const nonNegativeNumber = finiteNumber.min(0);
const dateValue = z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), 'Ngày không hợp lệ');
const ticker = z.string().trim().min(1).max(32);

export const assetClassSchema = z.enum(['STOCK', 'CASH', 'SAVING', 'FUND']) satisfies z.ZodType<AssetClass>;
export const transactionTypeSchema = z.enum([
  'BUY', 'SELL', 'DEPOSIT', 'WITHDRAW', 'DIVIDEND', 'STOCK_DIVIDEND', 'INTEREST',
]) satisfies z.ZodType<TransactionType>;

export const transactionInputSchema = z.object({
  id: z.uuid(),
  date: dateValue,
  assetClass: assetClassSchema,
  ticker,
  type: transactionTypeSchema,
  quantity: nonNegativeNumber,
  price: nonNegativeNumber,
  fee: nonNegativeNumber,
  tax: nonNegativeNumber,
  totalValue: finiteNumber,
  notes: z.string().max(1000).optional(),
  source: z.string().max(64).optional(),
});

export const cashLedgerEventTypeSchema = z.enum([
  'OPENING_BALANCE', 'TRADE_SETTLEMENT_BUY', 'TRADE_SETTLEMENT_SELL', 'TRADE_FEE', 'EXCHANGE_FEE',
  'DEPOSITORY_FEE', 'SELL_TAX', 'INTEREST', 'DEPOSIT', 'WITHDRAW', 'DIVIDEND_CASH', 'SELL_ADVANCE',
  'SELL_ADVANCE_REPAYMENT', 'BANK_TRANSFER_OUT', 'OTHER_ADJUSTMENT',
]) satisfies z.ZodType<CashLedgerEventType>;

export const cashLedgerEventInputSchema = z.object({
  id: z.uuid(),
  date: dateValue,
  direction: z.enum(['INFLOW', 'OUTFLOW']),
  amount: nonNegativeNumber,
  balanceAfter: finiteNumber,
  eventType: cashLedgerEventTypeSchema,
  description: z.string().max(1000),
  source: z.string().max(64),
  referenceTicker: ticker.optional(),
  referenceQuantity: nonNegativeNumber.optional(),
  referenceTradeDate: dateValue.optional(),
});

export const importBatchInputSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileChecksum: z.string().trim().min(1).max(128),
  source: z.string().max(64),
  importKind: z.enum(['TRANSACTION', 'CASH_LEDGER']),
  totalRows: z.number().int().min(0).max(MAX_BATCH_ROWS * 10),
  acceptedRows: z.number().int().min(0).max(MAX_BATCH_ROWS),
  rejectedRows: z.number().int().min(0).max(MAX_BATCH_ROWS * 10),
});

export const transactionBatchSchema = z.array(transactionInputSchema).max(MAX_BATCH_ROWS);
export const cashLedgerBatchSchema = z.array(cashLedgerEventInputSchema).max(MAX_BATCH_ROWS);

export const openingPositionsSchema = z.array(z.object({
  ticker: z.string().max(32),
  quantity: finiteNumber,
  averageCost: finiteNumber,
})).max(MAX_OPENING_POSITIONS);

export const cutoffSettingsSchema = z.object({
  globalCutoffDate: dateValue.nullable(),
  initialNetContributions: nonNegativeNumber,
  initialCashBalance: nonNegativeNumber,
});

/**
 * Parses untrusted Server Action input; throws a client-facing AppError (400) on failure.
 */
export function parseActionInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
      .join('; ');
    throw new AppError(`Dữ liệu không hợp lệ (${details}).`, 'VALIDATION_ERROR', 400);
  }
  return result.data;
}
