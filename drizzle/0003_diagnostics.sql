CREATE TABLE "diagnostics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"business" text NOT NULL,
	"segment" text NOT NULL,
	"presence" text NOT NULL,
	"problems" jsonb NOT NULL,
	"timing" text NOT NULL,
	"whatsapp" text NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "diagnostics_created_idx" ON "diagnostics" USING btree ("created_at");