DO $$ BEGIN
 CREATE TYPE "public"."asset_type" AS ENUM('STOCK', 'ETF', 'MUTUAL_FUND', 'CASH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
ALTER TABLE "market_prices" ADD COLUMN "asset_type" "asset_type" DEFAULT 'STOCK' NOT NULL;--> statement-breakpoint
ALTER TABLE "price_history" ADD COLUMN "asset_type" "asset_type" DEFAULT 'STOCK' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "asset_type" "asset_type" DEFAULT 'STOCK' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "forex_pair_date_idx" ON "forex_rates_history" ("target_currency","recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forex_recorded_at_idx" ON "forex_rates_history" ("recorded_at");