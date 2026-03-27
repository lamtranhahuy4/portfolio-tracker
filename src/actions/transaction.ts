'use server';

import { db } from '../db/index';
import { transactions } from '../db/schema';
import { desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function saveTransactionsBatch(data: any[]) {
  if (!data || data.length === 0) return;
  
  // Chuẩn hóa dữ liệu từ Format của UI (ticker, quantity) sang Format của DB (asset, amount)
  const mappedData = data.map(tx => ({
    id: tx.id,
    asset: tx.ticker,
    type: tx.type,
    amount: tx.quantity.toString(),
    price: tx.price.toString(),
    date: new Date(tx.date)
  }));

  // Bulk insert ignore duplicates via primary key conflict mechanism
  await db.insert(transactions).values(mappedData).onConflictDoNothing({ target: transactions.id });
  
  // Yêu cầu Next.js xóa cache và re-render trang dashboard gốc
  revalidatePath('/');
}

export async function fetchTransactions() {
  const dbTxs = await db.query.transactions.findMany({
    orderBy: [desc(transactions.date)],
  });

  // Ánh xạ phản ngược lại: Từ DB (asset, amount) sang chuẩn giao diện dùng cho Zustand (ticker, quantity)
  return dbTxs.map(tx => ({
    id: tx.id,
    date: tx.date,
    assetClass: 'STOCK', // Default fallback vì DB mới không lưu cột này
    ticker: tx.asset,
    type: tx.type,
    quantity: Number(tx.amount),
    price: Number(tx.price),
    fee: 0,
    totalValue: Number(tx.amount) * Number(tx.price),
  }));
}
