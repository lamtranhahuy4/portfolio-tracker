CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "asset_class" varchar(20) NOT NULL DEFAULT 'STOCK';
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "fee" numeric NOT NULL DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "tax" numeric NOT NULL DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "source" varchar(32);

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
