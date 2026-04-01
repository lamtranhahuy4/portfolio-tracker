CREATE TABLE IF NOT EXISTS "opening_positions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "cutoff_date" timestamp NOT NULL,
  "asset" varchar(32) NOT NULL,
  "quantity" numeric NOT NULL,
  "average_cost" numeric NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "opening_positions_user_cutoff_idx"
  ON "opening_positions" ("user_id", "cutoff_date");

CREATE UNIQUE INDEX IF NOT EXISTS "opening_positions_user_asset_idx"
  ON "opening_positions" ("user_id", "asset");
