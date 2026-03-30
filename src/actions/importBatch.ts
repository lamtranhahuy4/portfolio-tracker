'use server';

import { and, desc, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/index';
import { cashLedgerEvents, importBatches, transactions } from '@/db/schema';
import { deriveImportBatchStatus } from '@/lib/importBatches';
import { requireUser } from '@/lib/auth';
import { ImportBatchInput, ImportBatchRecord } from '@/types/importAudit';

async function assertNoActiveDuplicateBatch(userId: string, input: ImportBatchInput) {
  const [existingBatch] = await db.select({
    id: importBatches.id,
  }).from(importBatches).where(and(
    eq(importBatches.userId, userId),
    eq(importBatches.fileChecksum, input.fileChecksum),
    eq(importBatches.importKind, input.importKind),
    isNull(importBatches.rolledBackAt)
  )).limit(1);

  if (existingBatch) {
    throw new Error('File này đã được import trước đó và chưa rollback.');
  }
}

export async function createImportBatch(input: ImportBatchInput) {
  const user = await requireUser();
  await assertNoActiveDuplicateBatch(user.id, input);

  const [batch] = await db.insert(importBatches).values({
    userId: user.id,
    fileName: input.fileName,
    fileChecksum: input.fileChecksum,
    source: input.source,
    importKind: input.importKind,
    status: deriveImportBatchStatus(input),
    totalRows: input.totalRows,
    acceptedRows: input.acceptedRows,
    rejectedRows: input.rejectedRows,
  }).returning({
    id: importBatches.id,
    status: importBatches.status,
    importedAt: importBatches.importedAt,
  });

  return {
    batchId: batch.id,
    status: batch.status as ImportBatchRecord['status'],
    importedAt: batch.importedAt,
  };
}

export async function fetchImportBatches(): Promise<ImportBatchRecord[]> {
  const user = await requireUser();
  const rows = await db.select({
    id: importBatches.id,
    fileName: importBatches.fileName,
    fileChecksum: importBatches.fileChecksum,
    source: importBatches.source,
    importKind: importBatches.importKind,
    status: importBatches.status,
    totalRows: importBatches.totalRows,
    acceptedRows: importBatches.acceptedRows,
    rejectedRows: importBatches.rejectedRows,
    importedAt: importBatches.importedAt,
    rolledBackAt: importBatches.rolledBackAt,
  }).from(importBatches).where(eq(importBatches.userId, user.id)).orderBy(desc(importBatches.importedAt));

  return rows.map((row) => ({
    ...row,
    importKind: row.importKind as ImportBatchRecord['importKind'],
    status: row.status as ImportBatchRecord['status'],
    rolledBackAt: row.rolledBackAt ?? null,
  }));
}

export async function rollbackImportBatchAction(batchId: string) {
  const user = await requireUser();

  const [batch] = await db.select({
    id: importBatches.id,
    status: importBatches.status,
    rolledBackAt: importBatches.rolledBackAt,
  }).from(importBatches).where(and(
    eq(importBatches.id, batchId),
    eq(importBatches.userId, user.id)
  )).limit(1);

  if (!batch) {
    throw new Error('Không tìm thấy batch import thuộc tài khoản hiện tại.');
  }

  if (batch.rolledBackAt || batch.status === 'ROLLED_BACK') {
    throw new Error('Batch import này đã được rollback trước đó.');
  }

  await db.delete(transactions).where(and(
    eq(transactions.userId, user.id),
    eq(transactions.batchId, batchId)
  ));
  await db.delete(cashLedgerEvents).where(and(
    eq(cashLedgerEvents.userId, user.id),
    eq(cashLedgerEvents.batchId, batchId)
  ));
  await db.update(importBatches).set({
    status: 'ROLLED_BACK',
    rolledBackAt: new Date(),
  }).where(and(
    eq(importBatches.id, batchId),
    eq(importBatches.userId, user.id)
  ));

  revalidatePath('/');
  revalidatePath('/account');

  return { success: true };
}
