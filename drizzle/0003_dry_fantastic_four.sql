CREATE INDEX IF NOT EXISTS "transactions_user_date_idx" ON "transactions" ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_user_asset_idx" ON "transactions" ("user_id","asset");--> statement-breakpoint
ALTER TABLE "market_prices" DROP COLUMN IF EXISTS "asset_type";--> statement-breakpoint
ALTER TABLE "price_history" DROP COLUMN IF EXISTS "asset_type";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "asset_type";