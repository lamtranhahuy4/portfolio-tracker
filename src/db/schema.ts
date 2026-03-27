import { pgTable, varchar, numeric, timestamp, uuid } from 'drizzle-orm/pg-core';

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  asset: varchar('asset').notNull(),
  type: varchar('type').notNull(), // 'BUY' hoặc 'SELL'
  amount: numeric('amount').notNull(),
  price: numeric('price').notNull(),
  date: timestamp('date', { mode: 'date' }).notNull(),
});