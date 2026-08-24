CREATE TABLE "device_tracking_configurations" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_device_id" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"consent_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_tracking_configurations_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "device_tracking_events" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"provider" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"accuracy_meters" double precision,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"recorded_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tracking_event_device_idx" ON "device_tracking_events" USING btree ("device_id","recorded_at");