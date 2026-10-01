-- Rocket Alliance: programa de parcerias. Reversão: drizzle/rollback/0005_alliance.down.sql
CREATE SEQUENCE IF NOT EXISTS "referral_code_seq";--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "support_ticket_seq";--> statement-breakpoint
CREATE TABLE "alliance_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"important" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"min_tier_rank" smallint DEFAULT 1 NOT NULL,
	"modalities" text[] DEFAULT '{}'::text[] NOT NULL,
	"partner_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alliance_announcements_status_check" CHECK ("alliance_announcements"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "alliance_email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dedupe_key" text NOT NULL,
	"template" text NOT NULL,
	"to_email" text NOT NULL,
	"partner_id" uuid,
	"status" text DEFAULT 'sending' NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"provider_id" text,
	"last_error" text,
	"params" jsonb,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alliance_email_log_status_check" CHECK ("alliance_email_log"."status" in ('sending', 'sent', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "alliance_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alliance_files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "alliance_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"referral_id" uuid,
	"receipt_id" uuid,
	"rule_id" uuid,
	"kind" text NOT NULL,
	"tier_key" text,
	"base_cents" bigint DEFAULT 0 NOT NULL,
	"rate_bp" integer,
	"amount_cents" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"reversal_of" uuid,
	"payout_id" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_entries_kind_check" CHECK ("commission_entries"."kind" in ('commission', 'reversal', 'adjustment')),
	CONSTRAINT "commission_entries_status_check" CHECK ("commission_entries"."status" in ('pending', 'approved', 'paid', 'cancelled')),
	CONSTRAINT "commission_entries_amount_nonzero" CHECK ("commission_entries"."amount_cents" <> 0),
	CONSTRAINT "commission_entries_source_check" CHECK ("commission_entries"."kind" = 'adjustment' OR "commission_entries"."receipt_id" IS NOT NULL),
	CONSTRAINT "commission_entries_paid_has_payout" CHECK (("commission_entries"."status" = 'paid') = ("commission_entries"."payout_id" IS NOT NULL)),
	CONSTRAINT "commission_entries_adjustment_reason" CHECK ("commission_entries"."kind" <> 'adjustment' OR length("commission_entries"."reason") > 0)
);
--> statement-breakpoint
CREATE TABLE "commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"partner_id" uuid,
	"tier_key" text,
	"modality_key" text,
	"scope" text DEFAULT 'all' NOT NULL,
	"rate_bp" integer NOT NULL,
	"recurring_months" smallint DEFAULT 12 NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_rules_rate_range" CHECK ("commission_rules"."rate_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "commission_rules_months_range" CHECK ("commission_rules"."recurring_months" BETWEEN 0 AND 120),
	CONSTRAINT "commission_rules_scope_check" CHECK ("commission_rules"."scope" in ('all', 'one_time', 'recurring')),
	CONSTRAINT "commission_rules_status_check" CHECK ("commission_rules"."status" in ('draft', 'approved', 'archived')),
	CONSTRAINT "commission_rules_dates_check" CHECK ("commission_rules"."valid_to" IS NULL OR "commission_rules"."valid_to" >= "commission_rules"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"deadline" date,
	"min_tier_rank" smallint DEFAULT 1 NOT NULL,
	"modalities" text[] DEFAULT '{}'::text[] NOT NULL,
	"partner_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunities_status_check" CHECK ("opportunities"."status" in ('draft', 'open', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "opportunity_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"partner_user_id" uuid,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_interests_status_check" CHECK ("opportunity_interests"."status" in ('sent', 'accepted', 'declined'))
);
--> statement-breakpoint
CREATE TABLE "partner_application_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"action" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"email" text NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"phone" text NOT NULL,
	"sector" text NOT NULL,
	"modality_key" text NOT NULL,
	"company_description" text NOT NULL,
	"interest" text NOT NULL,
	"consent_privacy" boolean NOT NULL,
	"consent_marketing" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"decision_message" text DEFAULT '' NOT NULL,
	"internal_notes" text DEFAULT '' NOT NULL,
	"partner_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_applications_status_check" CHECK ("partner_applications"."status" in ('pending_review', 'info_requested', 'approved', 'rejected')),
	CONSTRAINT "partner_applications_consent_check" CHECK ("partner_applications"."consent_privacy" = true)
);
--> statement-breakpoint
CREATE TABLE "partner_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"requested_by" uuid,
	"changes" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_note" text DEFAULT '' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_change_requests_status_check" CHECK ("partner_change_requests"."status" in ('pending', 'approved', 'rejected', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "partner_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'partnership' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"terms" text DEFAULT '' NOT NULL,
	"terms_sha256" text,
	"commercial_terms" text DEFAULT '' NOT NULL,
	"file_id" uuid,
	"sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"accepted_by" uuid,
	"accepted_name" text,
	"accepted_ip" text,
	"accepted_user_agent" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_contracts_status_check" CHECK ("partner_contracts"."status" in ('draft', 'sent', 'active', 'expired', 'terminated')),
	CONSTRAINT "partner_contracts_dates_check" CHECK ("partner_contracts"."ends_on" IS NULL OR "partner_contracts"."starts_on" IS NULL OR "partner_contracts"."ends_on" >= "partner_contracts"."starts_on"),
	CONSTRAINT "partner_contracts_accepted_check" CHECK ("partner_contracts"."accepted_at" IS NULL OR "partner_contracts"."terms_sha256" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "partner_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"caption" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_modalities" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_modality_links" (
	"partner_id" uuid NOT NULL,
	"modality_key" text NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_modality_links_partner_id_modality_key_pk" PRIMARY KEY("partner_id","modality_key")
);
--> statement-breakpoint
CREATE TABLE "partner_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"partner_user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_pages" (
	"partner_id" uuid PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"paid_on" date NOT NULL,
	"method" text NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_by" uuid,
	"voided_at" timestamp with time zone,
	"void_reason" text DEFAULT '' NOT NULL,
	CONSTRAINT "partner_payouts_amount_positive" CHECK ("partner_payouts"."amount_cents" > 0),
	CONSTRAINT "partner_payouts_status_check" CHECK ("partner_payouts"."status" in ('registered', 'voided'))
);
--> statement-breakpoint
CREATE TABLE "partner_projects" (
	"partner_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "partner_projects_partner_id_project_id_pk" PRIMARY KEY("partner_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "partner_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"file_id" uuid,
	"url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"min_tier_rank" smallint DEFAULT 1 NOT NULL,
	"modalities" text[] DEFAULT '{}'::text[] NOT NULL,
	"partner_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_resources_status_check" CHECK ("partner_resources"."status" in ('draft', 'published')),
	CONSTRAINT "partner_resources_source_check" CHECK (("partner_resources"."file_id" IS NOT NULL) <> ("partner_resources"."url" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "partner_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_tiers" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rank" smallint NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_user_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_user_tokens_type_check" CHECK ("partner_user_tokens"."type" in ('invite', 'password_reset', 'email_change', 'login_challenge'))
);
--> statement-breakpoint
CREATE TABLE "partner_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"password_hash" text,
	"status" text DEFAULT 'invited' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"totp_secret_enc" text,
	"totp_enabled_at" timestamp with time zone,
	"recovery_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone,
	"invited_by_user_id" uuid,
	"invited_by_partner_user_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_users_role_check" CHECK ("partner_users"."role" in ('owner', 'manager', 'member')),
	CONSTRAINT "partner_users_status_check" CHECK ("partner_users"."status" in ('invited', 'active', 'disabled')),
	CONSTRAINT "partner_users_active_has_password" CHECK ("partner_users"."status" <> 'active' OR "partner_users"."password_hash" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"trade_name" text NOT NULL,
	"legal_name" text DEFAULT '' NOT NULL,
	"tax_id" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'onboarding' NOT NULL,
	"tier_key" text DEFAULT 'member' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"sector" text DEFAULT '' NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"specialties" text[] DEFAULT '{}'::text[] NOT NULL,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"website_url" text DEFAULT '' NOT NULL,
	"social_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"logo_media_id" uuid,
	"logo_alt_media_id" uuid,
	"cover_media_id" uuid,
	"og_media_id" uuid,
	"accent_color" text DEFAULT '#2c9df5' NOT NULL,
	"testimonials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"show_tier" boolean DEFAULT false NOT NULL,
	"directory_enabled" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"managers_invite" boolean DEFAULT false NOT NULL,
	"quality_score" smallint,
	"satisfaction_score" smallint,
	"compliance_ok" boolean DEFAULT true NOT NULL,
	"internal_notes" text DEFAULT '' NOT NULL,
	"application_id" uuid,
	"published_snapshot" jsonb,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_slug_format" CHECK ("partners"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "partners_status_check" CHECK ("partners"."status" in ('onboarding', 'active', 'suspended', 'terminated')),
	CONSTRAINT "partners_accent_hex" CHECK ("partners"."accent_color" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "partners_scores_range" CHECK (("partners"."quality_score" IS NULL OR "partners"."quality_score" BETWEEN 1 AND 5) AND ("partners"."satisfaction_score" IS NULL OR "partners"."satisfaction_score" BETWEEN 1 AND 5))
);
--> statement-breakpoint
CREATE TABLE "referral_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text DEFAULT '' NOT NULL,
	"visible_to_partner" boolean DEFAULT true NOT NULL,
	"actor_type" text NOT NULL,
	"actor_user_id" uuid,
	"actor_partner_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_events_actor_check" CHECK ("referral_events"."actor_type" in ('partner', 'cms', 'system'))
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text DEFAULT 'RA-' || lpad(nextval('referral_code_seq')::text, 6, '0') NOT NULL,
	"partner_id" uuid NOT NULL,
	"submitted_by" uuid,
	"company_name" text NOT NULL,
	"company_website" text DEFAULT '' NOT NULL,
	"company_tax_id" text,
	"company_domain" text,
	"company_name_key" text,
	"contact_name" text NOT NULL,
	"contact_role" text DEFAULT '' NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"need" text NOT NULL,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"estimated_value_cents" bigint,
	"deal_value_cents" bigint,
	"consent_confirmed" boolean NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"owner_user_id" uuid,
	"protected_until" timestamp with time zone NOT NULL,
	"lost_reason" text DEFAULT '' NOT NULL,
	"internal_notes" text DEFAULT '' NOT NULL,
	"possible_duplicate_of" uuid,
	"won_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_status_check" CHECK ("referrals"."status" in ('submitted', 'under_review', 'qualified', 'in_negotiation', 'won', 'lost', 'cancelled')),
	CONSTRAINT "referrals_consent_check" CHECK ("referrals"."consent_confirmed" = true),
	CONSTRAINT "referrals_values_positive" CHECK (("referrals"."estimated_value_cents" IS NULL OR "referrals"."estimated_value_cents" >= 0) AND ("referrals"."deal_value_cents" IS NULL OR "referrals"."deal_value_cents" >= 0))
);
--> statement-breakpoint
CREATE TABLE "revenue_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"installment_number" smallint,
	"amount_cents" bigint NOT NULL,
	"received_on" date NOT NULL,
	"refund_of" uuid,
	"description" text DEFAULT '' NOT NULL,
	"external_ref" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_receipts_kind_check" CHECK ("revenue_receipts"."kind" in ('one_time', 'recurring', 'refund')),
	CONSTRAINT "revenue_receipts_amount_positive" CHECK ("revenue_receipts"."amount_cents" > 0),
	CONSTRAINT "revenue_receipts_installment_check" CHECK (("revenue_receipts"."kind" = 'recurring') = ("revenue_receipts"."installment_number" IS NOT NULL) AND ("revenue_receipts"."installment_number" IS NULL OR "revenue_receipts"."installment_number" >= 1)),
	CONSTRAINT "revenue_receipts_refund_check" CHECK (("revenue_receipts"."kind" = 'refund') = ("revenue_receipts"."refund_of" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_type" text NOT NULL,
	"author_user_id" uuid,
	"author_partner_user_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_messages_author_check" CHECK ("support_messages"."author_type" in ('partner', 'cms'))
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text DEFAULT 'SUP-' || lpad(nextval('support_ticket_seq')::text, 5, '0') NOT NULL,
	"partner_id" uuid NOT NULL,
	"created_by" uuid,
	"subject" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_status_check" CHECK ("support_tickets"."status" in ('open', 'answered', 'closed'))
);
--> statement-breakpoint
ALTER TABLE "alliance_announcements" ADD CONSTRAINT "alliance_announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_email_log" ADD CONSTRAINT "alliance_email_log_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_files" ADD CONSTRAINT "alliance_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_settings" ADD CONSTRAINT "alliance_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_receipt_id_revenue_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."revenue_receipts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_rule_id_commission_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."commission_rules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_reversal_of_commission_entries_id_fk" FOREIGN KEY ("reversal_of") REFERENCES "public"."commission_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_payout_id_partner_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."partner_payouts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_tier_key_partner_tiers_key_fk" FOREIGN KEY ("tier_key") REFERENCES "public"."partner_tiers"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_modality_key_partner_modalities_key_fk" FOREIGN KEY ("modality_key") REFERENCES "public"."partner_modalities"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_interests" ADD CONSTRAINT "opportunity_interests_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_interests" ADD CONSTRAINT "opportunity_interests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_interests" ADD CONSTRAINT "opportunity_interests_partner_user_id_partner_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."partner_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_application_events" ADD CONSTRAINT "partner_application_events_application_id_partner_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."partner_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_application_events" ADD CONSTRAINT "partner_application_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_modality_key_partner_modalities_key_fk" FOREIGN KEY ("modality_key") REFERENCES "public"."partner_modalities"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_change_requests" ADD CONSTRAINT "partner_change_requests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_change_requests" ADD CONSTRAINT "partner_change_requests_requested_by_partner_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."partner_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_change_requests" ADD CONSTRAINT "partner_change_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_contracts" ADD CONSTRAINT "partner_contracts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_contracts" ADD CONSTRAINT "partner_contracts_file_id_alliance_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."alliance_files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_contracts" ADD CONSTRAINT "partner_contracts_accepted_by_partner_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."partner_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_contracts" ADD CONSTRAINT "partner_contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_media" ADD CONSTRAINT "partner_media_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_media" ADD CONSTRAINT "partner_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_modality_links" ADD CONSTRAINT "partner_modality_links_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_modality_links" ADD CONSTRAINT "partner_modality_links_modality_key_partner_modalities_key_fk" FOREIGN KEY ("modality_key") REFERENCES "public"."partner_modalities"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "partner_modality_links" ADD CONSTRAINT "partner_modality_links_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_notifications" ADD CONSTRAINT "partner_notifications_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_notifications" ADD CONSTRAINT "partner_notifications_partner_user_id_partner_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."partner_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_pages" ADD CONSTRAINT "partner_pages_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_pages" ADD CONSTRAINT "partner_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_projects" ADD CONSTRAINT "partner_projects_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_projects" ADD CONSTRAINT "partner_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_resources" ADD CONSTRAINT "partner_resources_file_id_alliance_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."alliance_files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_resources" ADD CONSTRAINT "partner_resources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_sessions" ADD CONSTRAINT "partner_sessions_partner_user_id_partner_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."partner_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_user_tokens" ADD CONSTRAINT "partner_user_tokens_partner_user_id_partner_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."partner_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_invited_by_partner_user_id_partner_users_id_fk" FOREIGN KEY ("invited_by_partner_user_id") REFERENCES "public"."partner_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_tier_key_partner_tiers_key_fk" FOREIGN KEY ("tier_key") REFERENCES "public"."partner_tiers"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_alt_media_id_media_id_fk" FOREIGN KEY ("logo_alt_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_og_media_id_media_id_fk" FOREIGN KEY ("og_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_actor_partner_user_id_partner_users_id_fk" FOREIGN KEY ("actor_partner_user_id") REFERENCES "public"."partner_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_submitted_by_partner_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."partner_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_possible_duplicate_of_referrals_id_fk" FOREIGN KEY ("possible_duplicate_of") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipts" ADD CONSTRAINT "revenue_receipts_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipts" ADD CONSTRAINT "revenue_receipts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipts" ADD CONSTRAINT "revenue_receipts_refund_of_revenue_receipts_id_fk" FOREIGN KEY ("refund_of") REFERENCES "public"."revenue_receipts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipts" ADD CONSTRAINT "revenue_receipts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_partner_user_id_partner_users_id_fk" FOREIGN KEY ("author_partner_user_id") REFERENCES "public"."partner_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_partner_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."partner_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alliance_announcements_status_idx" ON "alliance_announcements" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "alliance_email_log_dedupe_unique" ON "alliance_email_log" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "alliance_email_log_status_idx" ON "alliance_email_log" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "commission_entries_receipt_unique" ON "commission_entries" USING btree ("receipt_id") WHERE "commission_entries"."receipt_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "commission_entries_partner_idx" ON "commission_entries" USING btree ("partner_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "commission_entries_payout_idx" ON "commission_entries" USING btree ("payout_id");--> statement-breakpoint
CREATE INDEX "commission_entries_referral_idx" ON "commission_entries" USING btree ("referral_id");--> statement-breakpoint
CREATE INDEX "commission_rules_lookup_idx" ON "commission_rules" USING btree ("status","partner_id","tier_key");--> statement-breakpoint
CREATE INDEX "opportunities_status_idx" ON "opportunities" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_interests_unique" ON "opportunity_interests" USING btree ("opportunity_id","partner_id");--> statement-breakpoint
CREATE INDEX "partner_application_events_app_idx" ON "partner_application_events" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "partner_applications_status_idx" ON "partner_applications" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "partner_applications_email_idx" ON "partner_applications" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "partner_change_requests_partner_idx" ON "partner_change_requests" USING btree ("partner_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "partner_change_requests_status_idx" ON "partner_change_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_contracts_version_unique" ON "partner_contracts" USING btree ("partner_id","kind","version");--> statement-breakpoint
CREATE INDEX "partner_contracts_partner_idx" ON "partner_contracts" USING btree ("partner_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "partner_media_partner_idx" ON "partner_media" USING btree ("partner_id","position");--> statement-breakpoint
CREATE INDEX "partner_media_media_idx" ON "partner_media" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "partner_notifications_user_idx" ON "partner_notifications" USING btree ("partner_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "partner_payouts_idempotency_unique" ON "partner_payouts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "partner_payouts_partner_idx" ON "partner_payouts" USING btree ("partner_id","paid_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "partner_resources_status_idx" ON "partner_resources" USING btree ("status","category","sort_order");--> statement-breakpoint
CREATE INDEX "partner_sessions_user_idx" ON "partner_sessions" USING btree ("partner_user_id");--> statement-breakpoint
CREATE INDEX "partner_sessions_expires_idx" ON "partner_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_tiers_rank_unique" ON "partner_tiers" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "partner_user_tokens_user_idx" ON "partner_user_tokens" USING btree ("partner_user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_users_email_unique" ON "partner_users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "partner_users_partner_idx" ON "partner_users" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partners_slug_unique" ON "partners" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "partners_status_idx" ON "partners" USING btree ("status");--> statement-breakpoint
CREATE INDEX "partners_directory_idx" ON "partners" USING btree ("directory_enabled","featured","sort_order");--> statement-breakpoint
CREATE INDEX "referral_events_referral_idx" ON "referral_events" USING btree ("referral_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_code_unique" ON "referrals" USING btree ("code");--> statement-breakpoint
CREATE INDEX "referrals_partner_idx" ON "referrals" USING btree ("partner_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "referrals_status_idx" ON "referrals" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "referrals_domain_idx" ON "referrals" USING btree ("company_domain");--> statement-breakpoint
CREATE INDEX "referrals_tax_id_idx" ON "referrals" USING btree ("company_tax_id");--> statement-breakpoint
CREATE INDEX "referrals_name_key_idx" ON "referrals" USING btree ("company_name_key");--> statement-breakpoint
CREATE INDEX "revenue_receipts_referral_idx" ON "revenue_receipts" USING btree ("referral_id","received_on");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_receipts_external_unique" ON "revenue_receipts" USING btree ("external_ref") WHERE "revenue_receipts"."external_ref" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_receipts_installment_unique" ON "revenue_receipts" USING btree ("referral_id","installment_number") WHERE "revenue_receipts"."kind" = 'recurring';--> statement-breakpoint
CREATE INDEX "support_messages_ticket_idx" ON "support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_code_unique" ON "support_tickets" USING btree ("code");--> statement-breakpoint
CREATE INDEX "support_tickets_partner_idx" ON "support_tickets" USING btree ("partner_id","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status","last_message_at" DESC NULLS LAST);--> statement-breakpoint
-- Modalidades e níveis oficiais (textos aprovados; nome e descrição editáveis depois no CMS).
INSERT INTO "partner_modalities" ("key", "name", "description", "sort_order") VALUES
	('referral', 'Referral Partner', 'Destinado a profissionais e empresas que indicam clientes à Rocket Vision. O parceiro recebe uma comissão quando sua indicação resulta em um contrato efetivamente pago. Entrada simplificada.', 1),
	('business', 'Business Partner', 'Para agências de marketing, consultorias, empresas de TI e representantes comerciais que desejam incluir as soluções da Rocket em seu portfólio. Permite vendas conjuntas, propostas comerciais compartilhadas e projetos em modelo white-label, mediante aprovação.', 2),
	('technology', 'Technology Partner', 'Para desenvolvedores, software houses e especialistas que complementam a capacidade técnica da Rocket Vision. Permite desenvolvimento conjunto, integrações, subcontratação e participação em projetos maiores.', 3),
	('strategic', 'Strategic Partner', 'Para empresas com potencial de estabelecer relacionamentos comerciais de longo prazo. Inclui iniciativas de co-marketing, produtos conjuntos, expansão para novos mercados e condições comerciais negociadas individualmente.', 4)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "partner_tiers" ("key", "name", "rank", "label", "description", "benefits") VALUES
	('member', 'Alliance Member', 1, 'Nível inicial', 'Nível inicial. Acesso ao portal, registro de indicações, materiais comerciais e comissões básicas.', '["Acesso ao portal", "Registro de indicações", "Materiais comerciais", "Comissões básicas"]'),
	('pro', 'Alliance Pro', 2, 'Nível de crescimento', 'Nível de crescimento. Condições comerciais ampliadas, treinamentos exclusivos, suporte prioritário e participação em campanhas conjuntas.', '["Condições comerciais ampliadas", "Treinamentos exclusivos", "Suporte prioritário", "Participação em campanhas conjuntas"]'),
	('elite', 'Alliance Elite', 3, 'Nível exclusivo', 'Nível exclusivo. Gestão de conta dedicada, planejamento comercial conjunto, acesso antecipado a novas soluções e condições personalizadas.', '["Gestão de conta dedicada", "Planejamento comercial conjunto", "Acesso antecipado a novas soluções", "Condições personalizadas"]')
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
-- Percentuais iniciais por nível: entram como proposta, aguardando aprovação comercial no CMS.
INSERT INTO "commission_rules" ("name", "tier_key", "scope", "rate_bp", "recurring_months", "valid_from", "status", "is_public", "notes") VALUES
	('Alliance Member: padrão', 'member', 'all', 500, 12, current_date, 'draft', true, 'Percentual inicial do programa, sujeito à aprovação comercial.'),
	('Alliance Pro: padrão', 'pro', 'all', 800, 12, current_date, 'draft', true, 'Percentual inicial do programa, sujeito à aprovação comercial.'),
	('Alliance Elite: padrão', 'elite', 'all', 1000, 12, current_date, 'draft', true, 'Percentual inicial do programa, sujeito à aprovação comercial.');--> statement-breakpoint
INSERT INTO "alliance_settings" ("key", "data") VALUES
	('program', '{"protectionDays": 90, "defaultRecurringMonths": 12, "notifyEmail": "", "supportEmail": "", "paymentTerms": "Os pagamentos são feitos após a aprovação da comissão, conforme o termo de parceria."}')
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
-- Permissões do Rocket Alliance (o seed também as sincroniza).
INSERT INTO "permissions" ("key", "description") VALUES
	('alliance.view', 'Ver o Rocket Alliance: visão geral, parceiros e indicações'),
	('alliance.applications', 'Avaliar candidaturas ao Rocket Alliance'),
	('alliance.partners', 'Cadastrar parceiros e convidar pessoas para o Alliance Hub'),
	('alliance.publish', 'Publicar parceiros no diretório e editar as páginas exclusivas'),
	('alliance.referrals', 'Gerenciar as indicações dos parceiros'),
	('alliance.finance', 'Ver e gerenciar comissões, recebimentos e pagamentos a parceiros'),
	('alliance.contracts', 'Gerenciar contratos e termos de parceria'),
	('alliance.resources', 'Gerenciar materiais, treinamentos e oportunidades do Alliance Hub'),
	('alliance.communications', 'Enviar comunicados e atender o suporte dos parceiros'),
	('alliance.settings', 'Alterar regras, níveis, modalidades e conteúdo público do programa')
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";--> statement-breakpoint
-- Owner: tudo. Administrador: opera o programa, sem finanças, contratos e configurações.
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT "roles"."id", "p"."key" FROM "roles" CROSS JOIN (VALUES ('alliance.view'), ('alliance.applications'), ('alliance.partners'), ('alliance.publish'), ('alliance.referrals'), ('alliance.finance'), ('alliance.contracts'), ('alliance.resources'), ('alliance.communications'), ('alliance.settings')) AS "p"("key")
WHERE "roles"."key" = 'owner'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT "roles"."id", "p"."key" FROM "roles" CROSS JOIN (VALUES ('alliance.view'), ('alliance.applications'), ('alliance.partners'), ('alliance.publish'), ('alliance.referrals'), ('alliance.resources'), ('alliance.communications')) AS "p"("key")
WHERE "roles"."key" = 'admin'
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Função nova: Gestor do Alliance (todo o programa e a mídia, sem editar o site).
INSERT INTO "roles" ("key", "name", "description", "is_system") VALUES
	('alliance_manager', 'Gestor do Alliance', 'Administra o Rocket Alliance inteiro, inclusive comissões, contratos e configurações. Não edita o site.', false)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT "roles"."id", "permissions"."key" FROM "roles" CROSS JOIN "permissions"
WHERE "roles"."key" = 'alliance_manager' AND ("permissions"."key" LIKE 'alliance.%' OR "permissions"."key" IN ('media.view', 'media.upload', 'media.edit'))
ON CONFLICT DO NOTHING;
