'use server';

import { db } from '../db/index';
import { transactions } from '../db/schema';
import { desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function saveTransactionsBatch(data: any[]) {
  if (!data || data.length === 0) return;
  
  // Bulk insert ignore duplicates via primary key conflict mechanism
  await db.insert(transactions).values(data).onConflictDoNothing({ target: transactions.id });
  
  // Yêu cầu Next.js xóa cache và re-render trang dashboard gốc
  revalidatePath('/');
}

export async function fetchTransactions() {
  return await db.query.transactions.findMany({
    orderBy: [desc(transactions.date)],
  });
}
