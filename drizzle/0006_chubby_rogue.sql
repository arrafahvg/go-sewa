CREATE TABLE "agreement_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"agreement_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer DEFAULT 0 NOT NULL,
	"line_total_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rental_agreements" ALTER COLUMN "booking_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_agreements" ADD COLUMN "customer_id" text;--> statement-breakpoint
CREATE INDEX "agreement_line_item_agreement_idx" ON "agreement_line_items" USING btree ("agreement_id");