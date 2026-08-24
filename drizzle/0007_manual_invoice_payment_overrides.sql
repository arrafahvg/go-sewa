ALTER TABLE "invoices" ADD COLUMN "payment_accounts" jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_qris_image_url" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_instructions" text;