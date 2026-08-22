CREATE TYPE "public"."booking_status" AS ENUM('draft', 'pending', 'awaiting_confirmation', 'confirmed', 'payment_pending', 'partially_paid', 'paid', 'reserved', 'ready_for_pickup', 'out_for_delivery', 'active_rental', 'return_due', 'overdue', 'returned', 'inspection', 'completed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."booking_channel" AS ENUM('online', 'in_store', 'phone', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('not_required', 'pending', 'held', 'partially_returned', 'returned', 'partially_forfeited', 'forfeited');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('available', 'reserved', 'rented', 'overdue', 'returning', 'inspection', 'maintenance', 'damaged', 'lost', 'retired', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'pending', 'partially_paid', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agreement_acceptances" (
	"id" text PRIMARY KEY NOT NULL,
	"agreement_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"version" integer NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"method" text DEFAULT 'online' NOT NULL,
	"accepted_at" timestamp,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "agreement_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"body_html" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"reason" text NOT NULL,
	"starts_on" timestamp NOT NULL,
	"ends_on" timestamp NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"locale_date" text NOT NULL,
	"available_count" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_device_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"device_id" text NOT NULL,
	"assigned_by_id" text,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "booking_extensions" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"device_id" text,
	"previous_ends_at" timestamp NOT NULL,
	"new_ends_at" timestamp NOT NULL,
	"additional_cents" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"product_id" text NOT NULL,
	"add_on_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"price_rule_kind" text,
	"price_rule_label" text,
	"add_on_cents" integer DEFAULT 0 NOT NULL,
	"line_total_cents" integer NOT NULL,
	"product_name_snapshot" text
);
--> statement-breakpoint
CREATE TABLE "booking_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"author_id" text,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"customer_id" text NOT NULL,
	"channel" "booking_channel" DEFAULT 'online' NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"fulfillment" text DEFAULT 'pickup' NOT NULL,
	"return_method" text DEFAULT 'return_to_location' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"delivery_address" text,
	"recipient_name" text,
	"recipient_phone" text,
	"delivery_notes" text,
	"delivery_fee_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"discount_reason" text,
	"rental_subtotal_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"deposit_cents" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by_id" text,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_id" text NOT NULL,
	"name_en" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb,
	"seo_title" text,
	"seo_description" text,
	"og_image" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "customer_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"url" text NOT NULL,
	"kind" text DEFAULT 'id' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"id_type" text,
	"id_number" text,
	"id_verified" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "damage_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text,
	"device_id" text NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"deposit_id" text NOT NULL,
	"kind" text DEFAULT 'held' NOT NULL,
	"amount_cents" integer NOT NULL,
	"note" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "deposit_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_accessories" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"name" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"device_id" text NOT NULL,
	"condition" text NOT NULL,
	"missing_accessories" jsonb DEFAULT '[]'::jsonb,
	"damage_noted" boolean DEFAULT false NOT NULL,
	"notes" text,
	"checked_in_by_id" text NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_checkouts" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"device_id" text NOT NULL,
	"condition" text NOT NULL,
	"conditions_met" boolean DEFAULT false NOT NULL,
	"notes" text,
	"checked_out_by_id" text NOT NULL,
	"checked_out_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_condition_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"booking_id" text,
	"kind" text DEFAULT 'checkout' NOT NULL,
	"condition" text NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_damage_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"booking_id" text,
	"description" text NOT NULL,
	"severity" text DEFAULT 'minor' NOT NULL,
	"charge_cents" integer DEFAULT 0 NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_images" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"url" text NOT NULL,
	"kind" text DEFAULT 'condition' NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_maintenance" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"type" text DEFAULT 'repair' NOT NULL,
	"description" text NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"asset_code" text NOT NULL,
	"serial_number" text,
	"imei" text,
	"imei2" text,
	"status" "device_status" DEFAULT 'available' NOT NULL,
	"condition" text DEFAULT 'excellent' NOT NULL,
	"color" text,
	"storage" text,
	"battery_health" integer,
	"purchase_date" timestamp,
	"purchase_price_cents" integer,
	"current_booking_id" text,
	"last_maintenance_at" timestamp,
	"next_maintenance_at" timestamp,
	"last_inspected_at" timestamp,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE TABLE "faq" (
	"id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"question_en" text NOT NULL,
	"answer_id" text NOT NULL,
	"answer_en" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"checkin_id" text,
	"checkout_id" text,
	"passed" boolean DEFAULT false NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb,
	"inspected_by_id" text,
	"inspected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"body_html" text NOT NULL,
	"settings_json" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"booking_id" text,
	"customer_id" text,
	"template_id" text,
	"total_cents" integer NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"due_at" timestamp,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "late_fees" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"device_id" text,
	"days_late" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"waived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"source" text DEFAULT 'website' NOT NULL,
	"interest" text,
	"notes" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"kind" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"kind" text DEFAULT 'rental' NOT NULL,
	"reference" text,
	"received_at" timestamp,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_add_ons" (
	"product_id" text NOT NULL,
	"add_on_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"specs" jsonb DEFAULT '{}'::jsonb,
	"deposit_cents" integer DEFAULT 0 NOT NULL,
	"default_fulfillment" text DEFAULT 'pickup' NOT NULL,
	"image_url" text,
	"gallery" jsonb DEFAULT '[]'::jsonb,
	"seo_title" text,
	"seo_description" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rental_add_ons" (
	"id" text PRIMARY KEY NOT NULL,
	"name_id" text NOT NULL,
	"name_en" text NOT NULL,
	"cents_per_day" integer DEFAULT 0 NOT NULL,
	"cents_per_rental" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"booking_id" text NOT NULL,
	"template_id" text,
	"template_version" integer DEFAULT 1 NOT NULL,
	"content_html" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"generated_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rental_agreements_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "rental_pricing_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"cents_per_day" integer DEFAULT 0 NOT NULL,
	"package_cents" integer DEFAULT 0 NOT NULL,
	"weekdays" jsonb DEFAULT '[]'::jsonb,
	"starts_on" timestamp,
	"ends_on" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"rating" integer DEFAULT 5 NOT NULL,
	"quote_id" text NOT NULL,
	"quote_en" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "log_entity_idx" ON "activity_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "avail_block_device_idx" ON "availability_blocks" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "avail_summary_product_date_idx" ON "availability_summary" USING btree ("product_id","locale_date");--> statement-breakpoint
CREATE INDEX "alloc_booking_idx" ON "booking_device_allocations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "alloc_device_idx" ON "booking_device_allocations" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "booking_item_booking_idx" ON "booking_items" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_customer_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "booking_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_dates_idx" ON "bookings" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "condition_device_idx" ON "device_condition_reports" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "device_product_idx" ON "devices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "device_status_idx" ON "devices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "pa_product_idx" ON "product_add_ons" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "price_rule_product_idx" ON "rental_pricing_rules" USING btree ("product_id");