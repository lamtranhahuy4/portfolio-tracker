ALTER TABLE "transactions" DROP COLUMN IF EXISTS "asset_type";
--> statement-breakpoint
ALTER TABLE "market_prices" DROP COLUMN IF EXISTS "asset_type";
--> statement-breakpoint
ALTER TABLE "price_history" DROP COLUMN IF EXISTS "asset_type";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."asset_type";
