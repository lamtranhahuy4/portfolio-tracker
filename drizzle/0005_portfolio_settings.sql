CREATE TABLE IF NOT EXISTS "portfolio_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "fee_debt" numeric NOT NULL DEFAULT 0,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_settings_user_idx"
  ON "portfolio_settings" ("user_id");
