CREATE TABLE IF NOT EXISTS "import_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "file_name" varchar(255) NOT NULL,
  "file_checksum" varchar(128) NOT NULL,
  "source" varchar(32) NOT NULL,
  "import_kind" varchar(24) NOT NULL,
  "status" varchar(24) NOT NULL,
  "total_rows" integer NOT NULL,
  "accepted_rows" integer NOT NULL,
  "rejected_rows" integer NOT NULL,
  "imported_at" timestamp NOT NULL DEFAULT now(),
  "rolled_back_at" timestamp
);

CREATE INDEX IF NOT EXISTS "import_batches_user_imported_at_idx"
  ON "import_batches" ("user_id", "imported_at");

CREATE INDEX IF NOT EXISTS "import_batches_checksum_idx"
  ON "import_batches" ("user_id", "file_checksum", "import_kind");

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "batch_id" uuid REFERENCES "import_batches"("id") ON DELETE SET NULL;

ALTER TABLE "cash_ledger_events"
  ADD COLUMN IF NOT EXISTS "batch_id" uuid REFERENCES "import_batches"("id") ON DELETE SET NULL;
