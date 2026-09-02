'use server';

import { and, asc, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createImportBatch } from '@/actions/importBatch';
import { db } from '@/db/index';
import { cashLedgerEvents, importBatches } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { withErrorHandler } from '@/lib/errorHandler';
import { CashLedgerEvent } from '@/types/portfolio';
import { ImportBatchInput } from '@/types/importAudit';
import { toMoney, toQuantity } from '@/domain/portfolio/primitives';

function toLegacyImportInput(data: CashLedgerEvent[]): ImportBatchInput {
  return {
    fileName: 'legacy-cash-import',
    fileChecksum: crypto.randomUUID(),
    source: data[0]?.source ?? 'legacy',
    importKind: 'CASH_LEDGER',
    totalRows: data.length,
    acceptedRows: data.length,
    rejectedRows: 0,
  };
}

import { AppError } from '@/lib/errorHandler';
import { deriveImportBatchStatus } from '@/lib/importBatches';
import { ImportBatchRecord } from '@/types/importAudit';

export const saveCashEventsBatch = withErrorHandler(
async function saveCashEventsBatch(data: CashLedgerEvent[], importInput?: ImportBatchInput) {
  const user = await requireUser();
  const input = importInput ?? toLegacyImportInput(data);

  return await db.transaction(async (tx) => {
    // 1. Concurrency-safe duplicate check
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

    // 2. Insert batch record
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

    // 3. Insert cash ledger events
    const mappedData = data.map((evt) => ({
      id: evt.id,
      userId: user.id,
      batchId: batchRecord.id,
      date: new Date(evt.date),
      direction: evt.direction,
      amount: evt.amount.toString(),
      balanceAfter: evt.balanceAfter.toString(),
      eventType: evt.eventType,
      description: evt.description,
      source: evt.source,
      referenceTicker: evt.referenceTicker ?? null,
      referenceQuantity: evt.referenceQuantity ? evt.referenceQuantity.toString() : null,
      referenceTradeDate: evt.referenceTradeDate ? new Date(evt.referenceTradeDate) : null,
    }));

    if (mappedData.length > 0) {
      await tx.insert(cashLedgerEvents).values(mappedData).onConflictDoNothing({
        target: [
          cashLedgerEvents.userId,
          cashLedgerEvents.date,
          cashLedgerEvents.description,
          cashLedgerEvents.amount,
          cashLedgerEvents.balanceAfter,
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

export async function fetchCashEvents(): Promise<CashLedgerEvent[]> {
  try {
    const user = await requireUser();
    const records = await db.select()
      .from(cashLedgerEvents)
      .where(eq(cashLedgerEvents.userId, user.id))
      .orderBy(asc(cashLedgerEvents.date));

    return records.map((record) => ({
      id: record.id,
      batchId: record.batchId ?? undefined,
      date: new Date(record.date),
      direction: record.direction as 'INFLOW' | 'OUTFLOW',
      amount: toMoney(record.amount),
      balanceAfter: toMoney(record.balanceAfter),
      eventType: record.eventType as CashLedgerEvent['eventType'],
      description: record.description,
      source: record.source,
      referenceTicker: record.referenceTicker ?? undefined,
      referenceQuantity: record.referenceQuantity ? toQuantity(record.referenceQuantity) : undefined,
      referenceTradeDate: record.referenceTradeDate ? new Date(record.referenceTradeDate) : undefined,
    }));
  } catch (error) {
    if ((error as any).message === 'Not authenticated') {
      return [];
    }
    throw error;
  }
}

export async function saveManualDeposit(event: CashLedgerEvent) {
  const user = await requireUser();

  await db.insert(cashLedgerEvents).values({
    id: event.id,
    userId: user.id,
    date: new Date(event.date),
    direction: event.direction,
    amount: event.amount.toString(),
    balanceAfter: event.balanceAfter.toString(),
    eventType: event.eventType,
    description: event.description,
    source: 'manual',
    referenceTicker: null,
    referenceQuantity: null,
    referenceTradeDate: null,
  });
  revalidatePath('/');
}

export async function deleteMyCashEventsAction(confirmCommand: string) {
  const user = await requireUser();
  if (confirmCommand !== 'DELETE') {
    throw new Error('Lệnh xác nhận không hợp lệ.');
  }

  await db.delete(cashLedgerEvents).where(eq(cashLedgerEvents.userId, user.id));
  revalidatePath('/');
}
