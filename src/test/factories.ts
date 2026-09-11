import crypto from 'node:crypto';
import { transactions } from '../db/schema';

type Transaction = typeof transactions.$inferSelect;

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    batchId: null,
    assetClass: 'STOCK',
    asset: 'FPT',
    type: 'BUY',
    amount: '100',
    price: '90000',
    fee: '0',
    tax: '0',
    notes: null,
    source: null,
    date: new Date(),
    ...overrides,
  };
}

export function makeQuoteRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ticker: 'FPT',
    price: 95000,
    change: 1000,
    changePercent: 1.06,
    updatedAt: new Date(),
    ...overrides,
  };
}
