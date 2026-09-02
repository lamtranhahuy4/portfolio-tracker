'use server';

import Decimal from 'decimal.js';
import { and, asc, eq, sql } from 'drizzle-orm';
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

import { AppError } from '@/lib/errorHandler';
import { deriveImportBatchStatus } from '@/lib/importBatches';
import { ImportBatchRecord } from '@/types/importAudit';

export const saveTransactionsBatch = withErrorHandler(async function saveTransactionsBatch(
  data: NormalizedTransaction[],
  importInput?: ImportBatchInput
) {
  const user = await requireUser();
  const input = importInput ?? toLegacyImportInput(data);

  return await db.transaction(async (tx) => {
    // 1. Check for active duplicate within the same transaction lock
    const existing = await tx
      .select({ id: importBatches.id })
      .from(importBatches)
      .where(
        and(
          eq(importBatches.userId, user.id),
          eq(importBatches.fileChecksum, input.fileChecksum),
          eq(importBatches.importKind, input.importKind),
          sql`${importBatches.rolledBackAt} IS NULL`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(
        'Tệp này đã được nhập trước đó. Vui lòng kiểm tra lịch sử nhập tệp.',
        'DUPLICATE_IMPORT',
        400
      );
    }

    // 2. Insert import_batch record inside the transaction
    const [batchRecord] = await tx
      .insert(importBatches)
      .values({
        userId: user.id,
        fileName: input.fileName,
        fileChecksum: input.fileChecksum,
        source: input.source,
        importKind: input.importKind,
        status: deriveImportBatchStatus(input),
        totalRows: input.totalRows,
        acceptedRows: input.acceptedRows,
        rejectedRows: input.rejectedRows,
      })
      .returning({
        id: importBatches.id,
        status: importBatches.status,
        importedAt: importBatches.importedAt,
      });

    // 3. Insert transaction rows referencing the new batchId
    const mappedData = data.map((txItem) => ({
      id: txItem.id,
      userId: user.id,
      batchId: batchRecord.id,
      assetClass: txItem.assetClass,
      asset: txItem.ticker,
      type: txItem.type,
      amount: txItem.quantity.toString(),
      price: txItem.price.toString(),
      fee: txItem.fee.toString(),
      tax: txItem.tax.toString(),
      notes: txItem.notes ?? null,
      source: txItem.source ?? null,
      date: new Date(txItem.date),
    }));

    if (mappedData.length > 0) {
      await tx.insert(transactions).values(mappedData).onConflictDoNothing({
        target: [
          transactions.userId,
          transactions.date,
          transactions.asset,
          transactions.type,
          transactions.amount,
          transactions.price,
        ],
      });
    }

    revalidatePath('/');

    return {
      batchId: batchRecord.id,
      status: batchRecord.status as ImportBatchRecord['status'],
      importedAt: batchRecord.importedAt,
    };
  });
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
