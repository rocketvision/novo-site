CREATE TABLE "availability_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "availability_blocks_range_check" CHECK ("availability_blocks"."ends_at" > "availability_blocks"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagnostic_id" uuid,
	"name" text NOT NULL,
	"business" text NOT NULL,
	"whatsapp" text NOT NULL,
	"email" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'reservando' NOT NULL,
	"google_event_id" text,
	"meet_url" text,
	"event_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('reservando', 'confirmado', 'cancelado'))
);
--> statement-breakpoint
CREATE TABLE "google_calendar_connection" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"email" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connected_by" uuid
);
--> statement-breakpoint
ALTER TABLE "diagnostics" ADD COLUMN "contact_preference" text;--> statement-breakpoint
ALTER TABLE "diagnostics" ADD COLUMN "booking_token_hash" text;--> statement-breakpoint
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_diagnostic_id_diagnostics_id_fk" FOREIGN KEY ("diagnostic_id") REFERENCES "public"."diagnostics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_connection" ADD CONSTRAINT "google_calendar_connection_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_blocks_range_idx" ON "availability_blocks" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_slot_unique" ON "bookings" USING btree ("starts_at") WHERE "bookings"."status" <> 'cancelado';--> statement-breakpoint
CREATE INDEX "bookings_starts_idx" ON "bookings" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "bookings_diagnostic_idx" ON "bookings" USING btree ("diagnostic_id");