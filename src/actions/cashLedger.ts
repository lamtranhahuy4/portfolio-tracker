'use server';

import { asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/index';
import { cashLedgerEvents } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { CashLedgerEvent } from '@/types/portfolio';

export async function saveCashEventsBatch(data: CashLedgerEvent[]) {
  if (!data || data.length === 0) return;

  const user = await requireUser();

  const mappedData = data.map((evt) => ({
    id: evt.id,
    userId: user.id,
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

  await db.insert(cashLedgerEvents).values(mappedData).onConflictDoNothing({ target: cashLedgerEvents.id });
  revalidatePath('/');
}

export async function fetchCashEvents(): Promise<CashLedgerEvent[]> {
  try {
    const user = await requireUser();
    const records = await db.select()
      .from(cashLedgerEvents)
      .where(eq(cashLedgerEvents.userId, user.id))
      .orderBy(asc(cashLedgerEvents.date));

    return records.map((record) => ({
      id: record.id,
      date: new Date(record.date),
      direction: record.direction as 'INFLOW' | 'OUTFLOW',
      amount: parseFloat(record.amount),
      balanceAfter: parseFloat(record.balanceAfter),
      eventType: record.eventType as any,
      description: record.description,
      source: record.source,
      referenceTicker: record.referenceTicker ?? undefined,
      referenceQuantity: record.referenceQuantity ? parseFloat(record.referenceQuantity) : undefined,
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
