'use server';

import Decimal from 'decimal.js';
import { and, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createImportBatch } from '@/actions/importBatch';
import { db } from '@/db/index';
import { importBatches, transactions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { withErrorHandler } from '@/lib/errorHandler';
import { NormalizedTransaction } from '@/types/portfolio';
import { ImportBatchInput } from '@/types/importAudit';
import { toMoney, toPrice, toQuantity } from '@/domain/portfolio/primitives';

function toLegacyImportInput(data: NormalizedTransaction[]): ImportBatchInput {
  return {
    fileName: 'legacy-transaction-import',
    fileChecksum: crypto.randomUUID(),
    source: data[0]?.source ?? 'legacy',
    importKind: 'TRANSACTION',
    totalRows: data.length,
    acceptedRows: data.length,
    rejectedRows: 0,
  };
}

export const saveTransactionsBatch = withErrorHandler(async function saveTransactionsBatch(data: NormalizedTransaction[], importInput?: ImportBatchInput) {
  const user = await requireUser();
  const batch = await createImportBatch(importInput ?? toLegacyImportInput(data));
  try {
    const mappedData = data.map((tx) => ({
      id: tx.id,
      userId: user.id,
      batchId: batch.batchId,
      assetClass: tx.assetClass,
      asset: tx.ticker,
      type: tx.type,
      amount: tx.quantity.toString(),
      price: tx.price.toString(),
      fee: tx.fee.toString(),
      tax: tx.tax.toString(),
      notes: tx.notes ?? null,
      source: tx.source ?? null,
      date: new Date(tx.date),
    }));

    if (mappedData.length > 0) {
      await db.insert(transactions).values(mappedData).onConflictDoNothing({ target: transactions.id });
    }
    revalidatePath('/');

    return batch;
  } catch (error) {
    try {
      await db.delete(importBatches).where(and(
        eq(importBatches.id, batch.batchId),
        eq(importBatches.userId, user.id)
      ));
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
      // Don't overwrite original error - throw it after rollback
    }
    // Original error will be thrown here
    throw error;
  }
});

export async function saveManualTransaction(tx: NormalizedTransaction) {
  const user = await requireUser();

  await db.insert(transactions).values({
    id: tx.id,
    userId: user.id,
    assetClass: tx.assetClass,
    asset: tx.ticker,
    type: tx.type,
    amount: tx.quantity.toString(),
    price: tx.price.toString(),
    fee: tx.fee.toString(),
    tax: tx.tax.toString(),
    notes: tx.notes ?? null,
    source: 'manual',
    date: new Date(tx.date),
  });
  revalidatePath('/');
}

export const fetchTransactions = withErrorHandler(async function fetchTransactions(): Promise<NormalizedTransaction[]> {
  const user = await requireUser();

  const dbTxs = await db.query.transactions.findMany({
    where: eq(transactions.userId, user.id),
    orderBy: [asc(transactions.date)],
  });

  return dbTxs.map((tx) => {
    const quantity = toQuantity(new Decimal(tx.amount).toNumber());
    const price = toPrice(new Decimal(tx.price).toNumber());
    const fee = toMoney(new Decimal(tx.fee).toNumber());
    const tax = toMoney(new Decimal(tx.tax).toNumber());
    const grossValue = new Decimal(tx.amount).times(tx.price);
    const totalValue = toMoney(
      tx.type === 'SELL'
        ? grossValue.minus(tx.fee).minus(tx.tax).toNumber()
        : grossValue.plus(tx.fee).plus(tx.tax).toNumber()
    );

    return {
      id: tx.id,
      batchId: tx.batchId ?? undefined,
      date: tx.date,
      assetClass: tx.assetClass as 'STOCK' | 'CASH' | 'SAVING',
      ticker: tx.asset,
      type: tx.type as NormalizedTransaction['type'],
      quantity,
      price,
      fee,
      tax,
      totalValue,
      notes: tx.notes ?? undefined,
      source: tx.source ?? undefined,
    };
  });
});
