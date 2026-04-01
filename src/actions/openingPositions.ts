'use server';

import Decimal from 'decimal.js';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/index';
import { openingPositions } from '@/db/schema';
import { toPrice, toQuantity } from '@/domain/portfolio/primitives';
import { requireUser } from '@/lib/auth';
import { OpeningPositionSnapshot } from '@/types/portfolio';

type OpeningPositionInput = {
  ticker: string;
  quantity: number;
  averageCost: number;
};

export async function fetchOpeningPositionSnapshot(): Promise<OpeningPositionSnapshot> {
  const user = await requireUser();
  const rows = await db.select()
    .from(openingPositions)
    .where(eq(openingPositions.userId, user.id));

  if (rows.length === 0) {
    return {
      cutoffDate: null,
      positions: [],
    };
  }

  const cutoffDate = rows[0].cutoffDate;

  return {
    cutoffDate,
    positions: rows
      .sort((a, b) => a.asset.localeCompare(b.asset))
      .map((row) => ({
        ticker: row.asset,
        quantity: toQuantity(new Decimal(row.quantity).toNumber()),
        averageCost: toPrice(new Decimal(row.averageCost).toNumber()),
      })),
  };
}

export async function saveOpeningPositionSnapshot(cutoffDateRaw: string, positions: OpeningPositionInput[]) {
  const user = await requireUser();

  const cutoffDate = new Date(cutoffDateRaw);
  if (Number.isNaN(cutoffDate.getTime())) {
    throw new Error('Ngày chốt sổ không hợp lệ.');
  }

  const sanitized = positions
    .map((item) => ({
      ticker: item.ticker.trim().toUpperCase(),
      quantity: Number(item.quantity),
      averageCost: Number(item.averageCost),
    }))
    .filter((item) => item.ticker && item.quantity > 0 && item.averageCost >= 0);

  await db.delete(openingPositions).where(eq(openingPositions.userId, user.id));

  if (sanitized.length > 0) {
    await db.insert(openingPositions).values(
      sanitized.map((item) => ({
        userId: user.id,
        cutoffDate,
        asset: item.ticker,
        quantity: item.quantity.toString(),
        averageCost: item.averageCost.toString(),
      }))
    );
  }

  revalidatePath('/');

  return {
    cutoffDate,
    positions: sanitized.map((item) => ({
      ticker: item.ticker,
      quantity: toQuantity(item.quantity),
      averageCost: toPrice(item.averageCost),
    })),
  };
}

export async function clearOpeningPositionSnapshot() {
  const user = await requireUser();
  await db.delete(openingPositions).where(eq(openingPositions.userId, user.id));
  revalidatePath('/');
  return { success: true };
}
