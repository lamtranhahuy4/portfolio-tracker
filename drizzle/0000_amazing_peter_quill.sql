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
CREATE TABLE IF NOT EXISTS "opening_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset" varchar(32) NOT NULL,
	"quantity" numeric(18, 4) NOT NULL,
	"average_cost" numeric(18, 4) NOT NULL,
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"batch_id" uuid,
	"asset_class" varchar(20) DEFAULT 'STOCK' NOT NULL,
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
CREATE INDEX IF NOT EXISTS "cash_ledger_events_user_date_idx" ON "cash_ledger_events" ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cash_ledger_events_dedupe_idx" ON "cash_ledger_events" ("user_id","date","description","amount","balance_after");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batches_user_imported_at_idx" ON "import_batches" ("user_id","imported_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batches_checksum_idx" ON "import_batches" ("user_id","file_checksum","import_kind");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "opening_positions_user_asset_idx" ON "opening_positions" ("user_id","asset");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_settings_user_idx" ON "portfolio_settings" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");