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
	"status" text DEFAULT 'novo' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "diagnostics_status_check" CHECK ("diagnostics"."status" in ('novo', 'em_contato', 'call_agendada', 'proposta', 'fechado', 'descartado'))
);
--> statement-breakpoint
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnostics_created_idx" ON "diagnostics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "diagnostics_status_idx" ON "diagnostics" USING btree ("status","created_at");--> statement-breakpoint
-- Permissões da área Diagnósticos (o seed também as sincroniza). Owner e Administrador recebem as três.
INSERT INTO "permissions" ("key", "description") VALUES
	('diagnostics.view', 'Ver os diagnósticos enviados pelo site'),
	('diagnostics.manage', 'Mudar a etapa e anotar os diagnósticos'),
	('diagnostics.delete', 'Excluir diagnósticos')
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT "roles"."id", "p"."key" FROM "roles" CROSS JOIN (VALUES ('diagnostics.view'), ('diagnostics.manage'), ('diagnostics.delete')) AS "p"("key")
WHERE "roles"."key" IN ('owner', 'admin')
ON CONFLICT DO NOTHING;
