import { boolean, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const importBatches = pgTable('import_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileChecksum: varchar('file_checksum', { length: 128 }).notNull(),
  source: varchar('source', { length: 32 }).notNull(),
  importKind: varchar('import_kind', { length: 24 }).notNull(),
  status: varchar('status', { length: 24 }).notNull(),
  totalRows: integer('total_rows').notNull(),
  acceptedRows: integer('accepted_rows').notNull(),
  rejectedRows: integer('rejected_rows').notNull(),
  importedAt: timestamp('imported_at', { mode: 'date' }).defaultNow().notNull(),
  rolledBackAt: timestamp('rolled_back_at', { mode: 'date' }),
}, (table) => ({
  userImportedAtIdx: index('import_batches_user_imported_at_idx').on(table.userId, table.importedAt),
  checksumIdx: index('import_batches_checksum_idx').on(table.userId, table.fileChecksum, table.importKind),
}));

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').references(() => importBatches.id, { onDelete: 'set null' }),
  assetClass: varchar('asset_class', { length: 20 }).default('STOCK').notNull(),
  asset: varchar('asset', { length: 32 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  amount: numeric('amount', { precision: 18, scale: 4 }).notNull(),
  price: numeric('price', { precision: 18, scale: 4 }).notNull(),
  fee: numeric('fee', { precision: 18, scale: 4 }).default('0').notNull(),
  tax: numeric('tax', { precision: 18, scale: 4 }).default('0').notNull(),
  notes: text('notes'),
  source: varchar('source', { length: 32 }),
  date: timestamp('date', { mode: 'date' }).notNull(),
});

export const cashLedgerEvents = pgTable('cash_ledger_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').references(() => importBatches.id, { onDelete: 'set null' }),
  date: timestamp('date', { mode: 'date' }).notNull(),
  direction: varchar('direction', { length: 16 }).notNull(),
  amount: numeric('amount', { precision: 18, scale: 4 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 18, scale: 4 }).notNull(),
  eventType: varchar('event_type', { length: 32 }).notNull(),
  description: text('description').notNull(),
  source: varchar('source', { length: 32 }).notNull(),
  referenceTicker: varchar('reference_ticker', { length: 32 }),
  referenceQuantity: numeric('reference_quantity', { precision: 18, scale: 4 }),
  referenceTradeDate: timestamp('reference_trade_date', { mode: 'date' }),
}, (table) => ({
  userDateIdx: index('cash_ledger_events_user_date_idx').on(table.userId, table.date),
  dedupeIdx: uniqueIndex('cash_ledger_events_dedupe_idx').on(
    table.userId,
    table.date,
    table.description,
    table.amount,
    table.balanceAfter
  ),
}));

export const openingPositions = pgTable('opening_positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  asset: varchar('asset', { length: 32 }).notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  averageCost: numeric('average_cost', { precision: 18, scale: 4 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userAssetIdx: uniqueIndex('opening_positions_user_asset_idx').on(table.userId, table.asset),
}));

export const portfolioSettings = pgTable('portfolio_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  feeDebt: numeric('fee_debt', { precision: 18, scale: 4 }).notNull().default('0'),
  globalCutoffDate: timestamp('global_cutoff_date', { mode: 'date' }),
  initialNetContributions: numeric('initial_net_contributions', { precision: 18, scale: 4 }).notNull().default('0'),
  initialCashBalance: numeric('initial_cash_balance', { precision: 18, scale: 4 }).notNull().default('0'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull().default('0.001'), // 0.1% default
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex('portfolio_settings_user_idx').on(table.userId),
}));

// Sessions table for secure session management
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }).defaultNow().notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  tokenHashIdx: uniqueIndex('sessions_token_hash_idx').on(table.tokenHash),
  expiresIdx: index('sessions_expires_idx').on(table.expiresAt),
}));

// Login attempts tracking for rate limiting
export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  attemptedAt: timestamp('attempted_at', { mode: 'date' }).defaultNow().notNull(),
  success: varchar('success', { length: 1 }).notNull().default('0'),
}, (table) => ({
  emailAttemptedAtIdx: index('login_attempts_email_at_idx').on(table.email, table.attemptedAt),
  ipAttemptedAtIdx: index('login_attempts_ip_at_idx').on(table.ipAddress, table.attemptedAt),
}));

// Account lockouts for brute force protection
export const accountLockouts = pgTable('account_lockouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  lockedUntil: timestamp('locked_until', { mode: 'date' }).notNull(),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  emailLockoutIdx: index('lockouts_email_idx').on(table.email),
  ipLockoutIdx: index('lockouts_ip_idx').on(table.ipAddress),
  userLockoutIdx: index('lockouts_user_idx').on(table.userId),
}));

// Market prices cache table
export const marketPrices = pgTable('market_prices', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: varchar('ticker', { length: 32 }).notNull(),
  assetClass: varchar('asset_class', { length: 20 }).notNull().default('STOCK'),
  price: numeric('price', { precision: 18, scale: 6 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('VND'),
  source: varchar('source', { length: 50 }),
  fetchedAt: timestamp('fetched_at', { mode: 'date' }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  isManualOverride: boolean('is_manual_override').default(false),
}, (table) => ({
  tickerIdx: uniqueIndex('market_prices_ticker_idx').on(table.ticker),
  fetchedAtIdx: index('market_prices_fetched_at_idx').on(table.fetchedAt),
  expiresAtIdx: index('market_prices_expires_at_idx').on(table.expiresAt),
}));

// Price history for audit trail
export const priceHistory = pgTable('price_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: varchar('ticker', { length: 32 }).notNull(),
  assetClass: varchar('asset_class', { length: 20 }).notNull(),
  price: numeric('price', { precision: 18, scale: 6 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('VND'),
  source: varchar('source', { length: 50 }),
  recordedAt: timestamp('recorded_at', { mode: 'date' }).defaultNow().notNull(),
  recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'set null' }),
  reason: varchar('reason', { length: 255 }),
}, (table) => ({
  tickerRecordedAtIdx: index('price_history_ticker_recorded_idx').on(table.ticker, table.recordedAt),
}));

// Password reset tokens for secure password recovery
export const passwordResets = pgTable('password_resets', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('password_resets_email_idx').on(table.email),
  tokenHashIdx: uniqueIndex('password_resets_token_hash_idx').on(table.tokenHash),
}));

// Watchlist - stocks user wants to track
export const watchlist = pgTable('watchlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ticker: varchar('ticker', { length: 32 }).notNull(),
  name: varchar('name', { length: 128 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userTickerIdx: uniqueIndex('watchlist_user_ticker_idx').on(table.userId, table.ticker),
}));

// Price alerts
export const priceAlerts = pgTable('price_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ticker: varchar('ticker', { length: 32 }).notNull(),
  targetPrice: numeric('target_price', { precision: 18, scale: 6 }).notNull(),
  condition: varchar('condition', { length: 16 }).notNull(), // 'above' or 'below'
  isActive: boolean('is_active').default(true).notNull(),
  isTriggered: boolean('is_triggered').default(false).notNull(),
  triggeredAt: timestamp('triggered_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userTickerIdx: index('price_alerts_user_ticker_idx').on(table.userId, table.ticker),
  activeIdx: index('price_alerts_active_idx').on(table.isActive),
}));
