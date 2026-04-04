'use server';

import Decimal from 'decimal.js';
import { and, asc, eq } from 'drizzle-orm';
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

export const saveCashEventsBatch = withErrorHandler(
async function saveCashEventsBatch(data: CashLedgerEvent[], importInput?: ImportBatchInput) {
  const user = await requireUser();
  const batch = await createImportBatch(importInput ?? toLegacyImportInput(data));
  try {
    const mappedData = data.map((evt) => ({
      id: evt.id,
      userId: user.id,
      batchId: batch.batchId,
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
      await db.insert(cashLedgerEvents).values(mappedData).onConflictDoNothing({
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

    return batch;
  } catch (error) {
    try {
      await db.delete(importBatches).where(and(
        eq(importBatches.id, batch.batchId),
        eq(importBatches.userId, user.id)
      ));
    } catch (rollbackError) {
      console.error('[saveCashEventsBatch] Rollback failed:', rollbackError);
    }
    throw error;
  }
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

export async function deleteMyCashEventsAction(confirmCommand: string) {
  const user = await requireUser();
  if (confirmCommand !== 'DELETE') {
    throw new Error('Lệnh xác nhận không hợp lệ.');
  }

  await db.delete(cashLedgerEvents).where(eq(cashLedgerEvents.userId, user.id));
  revalidatePath('/');
}
