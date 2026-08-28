CREATE TABLE "booking_add_ons" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"add_on_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rental_add_ons" ADD COLUMN "stock_qty" integer;--> statement-breakpoint
CREATE INDEX "booking_addon_booking_idx" ON "booking_add_ons" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_addon_addon_idx" ON "booking_add_ons" USING btree ("add_on_id");