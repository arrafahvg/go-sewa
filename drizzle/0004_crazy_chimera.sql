ALTER TABLE "agreement_templates" ADD COLUMN "settings_json" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "rental_agreements" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_share_token_unique" UNIQUE("share_token");--> statement-breakpoint
ALTER TABLE "rental_agreements" ADD CONSTRAINT "rental_agreements_share_token_unique" UNIQUE("share_token");