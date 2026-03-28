'use server';

import { asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/index';
import { transactions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { NormalizedTransaction } from '@/types/portfolio';

export async function saveTransactionsBatch(data: NormalizedTransaction[]) {
  if (!data || data.length === 0) return;

  const user = await requireUser();

  const mappedData = data.map((tx) => ({
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
    source: tx.source ?? null,
    date: new Date(tx.date),
  }));

  await db.insert(transactions).values(mappedData).onConflictDoNothing({ target: transactions.id });
  revalidatePath('/');
}

export async function fetchTransactions() {
  const user = await requireUser();

  const dbTxs = await db.query.transactions.findMany({
    where: eq(transactions.userId, user.id),
    orderBy: [asc(transactions.date)],
  });

  return dbTxs.map((tx) => {
    const quantity = Number(tx.amount);
    const price = Number(tx.price);
    const fee = Number(tx.fee);
    const tax = Number(tx.tax);
    const grossValue = quantity * price;
    const totalValue = tx.type === 'SELL'
      ? grossValue - fee - tax
      : grossValue + fee + tax;

    return {
      id: tx.id,
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
}

