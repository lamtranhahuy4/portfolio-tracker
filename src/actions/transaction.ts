'use server';

import Decimal from 'decimal.js';
import { and, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createImportBatch } from '@/actions/importBatch';
import { db } from '@/db/index';
import { importBatches, transactions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { NormalizedTransaction } from '@/types/portfolio';
import { ImportBatchInput } from '@/types/importAudit';

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

export async function saveTransactionsBatch(data: NormalizedTransaction[], importInput?: ImportBatchInput) {
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
    }
    throw error;
  }
}

export async function fetchTransactions() {
  const user = await requireUser();

  try {
    const dbTxs = await db.query.transactions.findMany({
      where: eq(transactions.userId, user.id),
      orderBy: [asc(transactions.date)],
    });

    return dbTxs.map((tx) => {
      const quantity = new Decimal(tx.amount).toNumber();
      const price = new Decimal(tx.price).toNumber();
      const fee = new Decimal(tx.fee).toNumber();
      const tax = new Decimal(tx.tax).toNumber();
      const grossValue = new Decimal(tx.amount).times(tx.price);
      const totalValue = tx.type === 'SELL'
        ? grossValue.minus(tx.fee).minus(tx.tax)
        : grossValue.plus(tx.fee).plus(tx.tax);

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
        totalValue: totalValue.toNumber(),
        notes: tx.notes ?? undefined,
        source: tx.source ?? undefined,
      };
    });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw new Error('Không thể tải danh sách giao dịch.');
  }
}

