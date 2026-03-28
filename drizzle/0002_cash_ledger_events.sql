CREATE TABLE IF NOT EXISTS "cash_ledger_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "direction" varchar(16) NOT NULL,
  "amount" numeric NOT NULL,
  "balance_after" numeric NOT NULL,
  "event_type" varchar(32) NOT NULL,
  "description" text NOT NULL,
  "source" varchar(32) NOT NULL,
  "reference_ticker" varchar(32),
  "reference_quantity" numeric,
  "reference_trade_date" timestamp
);

CREATE INDEX IF NOT EXISTS "cash_ledger_events_user_date_idx"
  ON "cash_ledger_events" ("user_id", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "cash_ledger_events_dedupe_idx"
  ON "cash_ledger_events" ("user_id", "date", "description", "amount", "balance_after");
