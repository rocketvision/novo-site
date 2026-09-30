-- Reversão da migration 0005_alliance (Rocket Alliance).
--
-- ATENÇÃO: apaga TODOS os dados do programa (parceiros, indicações, comissões, pagamentos, contratos).
-- Faça um snapshot/branch do Neon antes. Rode em uma transação:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -1 -f drizzle/rollback/0005_alliance.down.sql
--
-- Não mexe em nada que existia antes da 0005 (usuários, projetos, mídia, auditoria, conteúdo).

DELETE FROM "role_permissions" WHERE "permission_key" LIKE 'alliance.%';
DELETE FROM "role_permissions" WHERE "role_id" IN (SELECT "id" FROM "roles" WHERE "key" = 'alliance_manager');
UPDATE "users" SET "role_id" = (SELECT "id" FROM "roles" WHERE "key" = 'editor')
  WHERE "role_id" IN (SELECT "id" FROM "roles" WHERE "key" = 'alliance_manager');
DELETE FROM "roles" WHERE "key" = 'alliance_manager';
DELETE FROM "permissions" WHERE "key" LIKE 'alliance.%';
DELETE FROM "media_usages" WHERE "resource_type" LIKE 'partner%';
DELETE FROM "content_sections" WHERE "key" = 'alliance';

DROP TABLE IF EXISTS
  "support_messages",
  "support_tickets",
  "partner_notifications",
  "alliance_email_log",
  "alliance_announcements",
  "partner_resources",
  "partner_contracts",
  "alliance_files",
  "commission_entries",
  "partner_payouts",
  "revenue_receipts",
  "commission_rules",
  "opportunity_interests",
  "opportunities",
  "referral_events",
  "referrals",
  "partner_user_tokens",
  "partner_sessions",
  "partner_change_requests",
  "partner_pages",
  "partner_projects",
  "partner_media",
  "partner_modality_links",
  "partner_application_events",
  "partner_applications",
  "partner_users",
  "partners",
  "partner_tiers",
  "partner_modalities",
  "alliance_settings"
CASCADE;

DROP SEQUENCE IF EXISTS "referral_code_seq";
DROP SEQUENCE IF EXISTS "support_ticket_seq";

-- Por último, o registro da migration (o drizzle-kit volta a considerá-la pendente).
-- created_at = "when" da entrada 0005_alliance em drizzle/meta/_journal.json (estável mesmo se o arquivo mudar).
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1790799124315;
