ALTER TABLE "orders" ADD COLUMN "shipping_address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;