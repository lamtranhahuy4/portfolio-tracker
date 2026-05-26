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
CREATE UNIQUE INDEX IF NOT EXISTS "gold_history_type_date_idx" ON "gold_history_cache" ("type","date");