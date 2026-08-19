DO $$ BEGIN
 CREATE TYPE "public"."asset_type" AS ENUM('STOCK', 'ETF', 'MUTUAL_FUND', 'CASH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_lockouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" varchar(255),
	"ip_address" varchar(45),
	"locked_until" timestamp NOT NULL,
	"reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_ledger_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"batch_id" uuid,
	"date" timestamp NOT NULL,
	"direction" varchar(16) NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"balance_after" numeric(18, 4) NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"description" text NOT NULL,
	"source" varchar(32) NOT NULL,
	"reference_ticker" varchar(32),
	"reference_quantity" numeric(18, 4),
	"reference_trade_date" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forex_rates_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" varchar(10) DEFAULT 'VND' NOT NULL,
	"target_currency" varchar(10) NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"buy_cash" numeric(18, 4),
	"buy_transfer" numeric(18, 4),
	"sell" numeric(18, 4),
	"source" varchar(50) DEFAULT 'VIETCOMBANK' NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gold_history_cache" (
	"type" varchar(32) NOT NULL,
	"date" varchar(16) NOT NULL,
	"buy" numeric(18, 2) NOT NULL,
	"sell" numeric(18, 2) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gold_prices_cache" (
	"type" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"buy" numeric(18, 2) NOT NULL,
	"sell" numeric(18, 2) NOT NULL,
	"change_buy" numeric(18, 2) NOT NULL,
	"change_sell" numeric(18, 2) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_checksum" varchar(128) NOT NULL,
	"source" varchar(32) NOT NULL,
	"import_kind" varchar(24) NOT NULL,
	"status" varchar(24) NOT NULL,
	"total_rows" integer NOT NULL,
	"accepted_rows" integer NOT NULL,
	"rejected_rows" integer NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"rolled_back_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"attempted_at" timestamp DEFAULT now() NOT NULL,
	"success" varchar(1) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(32) NOT NULL,
	"asset_class" varchar(20) DEFAULT 'STOCK' NOT NULL,
	"asset_type" "asset_type" DEFAULT 'STOCK' NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"currency" varchar(10) DEFAULT 'VND' NOT NULL,
	"source" varchar(50),
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"is_manual_override" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opening_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset" varchar(32) NOT NULL,
	"quantity" numeric(18, 4) NOT NULL,
	"average_cost" numeric(18, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fee_debt" numeric(18, 4) DEFAULT '0' NOT NULL,
	"global_cutoff_date" timestamp,
	"initial_net_contributions" numeric(18, 4) DEFAULT '0' NOT NULL,
	"initial_cash_balance" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0.001' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticker" varchar(32) NOT NULL,
	"target_price" numeric(18, 6) NOT NULL,
	"condition" varchar(16) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_triggered" boolean DEFAULT false NOT NULL,
	"triggered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(32) NOT NULL,
	"asset_class" varchar(20) NOT NULL,
	"asset_type" "asset_type" DEFAULT 'STOCK' NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"currency" varchar(10) DEFAULT 'VND' NOT NULL,
	"source" varchar(50),
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" uuid,
	"reason" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"batch_id" uuid,
	"asset_class" varchar(20) DEFAULT 'STOCK' NOT NULL,
	"asset_type" "asset_type" DEFAULT 'STOCK' NOT NULL,
	"asset" varchar(32) NOT NULL,
	"type" varchar(32) NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"price" numeric(18, 4) NOT NULL,
	"fee" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tax" numeric(18, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"source" varchar(32),
	"date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticker" varchar(32) NOT NULL,
	"name" varchar(128),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_lockouts" ADD CONSTRAINT "account_lockouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_ledger_events" ADD CONSTRAINT "cash_ledger_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_ledger_events" ADD CONSTRAINT "cash_ledger_events_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opening_positions" ADD CONSTRAINT "opening_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_settings" ADD CONSTRAINT "portfolio_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_history" ADD CONSTRAINT "price_history_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lockouts_email_idx" ON "account_lockouts" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lockouts_ip_idx" ON "account_lockouts" ("ip_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lockouts_user_idx" ON "account_lockouts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_ledger_events_user_date_idx" ON "cash_ledger_events" ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cash_ledger_events_dedupe_idx" ON "cash_ledger_events" ("user_id","date","description","amount","balance_after");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "forex_pair_date_idx" ON "forex_rates_history" ("target_currency","recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forex_recorded_at_idx" ON "forex_rates_history" ("recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gold_history_type_date_idx" ON "gold_history_cache" ("type","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batches_user_imported_at_idx" ON "import_batches" ("user_id","imported_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batches_checksum_idx" ON "import_batches" ("user_id","file_checksum","import_kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "login_attempts_email_at_idx" ON "login_attempts" ("email","attempted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "login_attempts_ip_at_idx" ON "login_attempts" ("ip_address","attempted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "market_prices_ticker_idx" ON "market_prices" ("ticker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_prices_fetched_at_idx" ON "market_prices" ("fetched_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_prices_expires_at_idx" ON "market_prices" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "opening_positions_user_asset_idx" ON "opening_positions" ("user_id","asset");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_resets_email_idx" ON "password_resets" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_token_hash_idx" ON "password_resets" ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_settings_user_idx" ON "portfolio_settings" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_alerts_user_ticker_idx" ON "price_alerts" ("user_id","ticker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_alerts_active_idx" ON "price_alerts" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_history_ticker_recorded_idx" ON "price_history" ("ticker","recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_idx" ON "sessions" ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_user_ticker_idx" ON "watchlist" ("user_id","ticker");