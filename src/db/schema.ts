import { pgTable, varchar, numeric, timestamp, uuid, text, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assetClass: varchar('asset_class', { length: 20 }).default('STOCK').notNull(),
  asset: varchar('asset', { length: 32 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  amount: numeric('amount').notNull(),
  price: numeric('price').notNull(),
  fee: numeric('fee').default('0').notNull(),
  tax: numeric('tax').default('0').notNull(),
  notes: text('notes'),
  source: varchar('source', { length: 32 }),
  date: timestamp('date', { mode: 'date' }).notNull(),
});

