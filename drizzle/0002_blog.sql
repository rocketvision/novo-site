-- Busca do Blog sem acento ("seguranca" encontra "segurança").
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE TYPE "public"."blog_affiliation" AS ENUM('team', 'guest');--> statement-breakpoint
CREATE TYPE "public"."blog_comment_kind" AS ENUM('comment', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."blog_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "blog_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"content" jsonb NOT NULL,
	"category_id" uuid,
	"author_id" uuid,
	"cover_media_id" uuid,
	"cover_alt" text DEFAULT '' NOT NULL,
	"cover_caption" text DEFAULT '' NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"reading_minutes" integer DEFAULT 1 NOT NULL,
	"status" "blog_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_snapshot" jsonb,
	"search_vector" "tsvector",
	"published_at" timestamp with time zone,
	"first_published_at" timestamp with time zone,
	"published_by" uuid,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_articles_slug_format" CHECK ("blog_articles"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "blog_articles_published_has_snapshot" CHECK ("blog_articles"."status" <> 'published' OR "blog_articles"."published_snapshot" IS NOT NULL),
	CONSTRAINT "blog_articles_scheduled_has_date" CHECK ("blog_articles"."status" <> 'scheduled' OR "blog_articles"."scheduled_at" IS NOT NULL),
	CONSTRAINT "blog_articles_reading_positive" CHECK ("blog_articles"."reading_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "blog_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"role_title" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"photo_media_id" uuid,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affiliation" "blog_affiliation" DEFAULT 'guest' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_authors_slug_format" CHECK ("blog_authors"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_categories_slug_format" CHECK ("blog_categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "blog_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"author_user_id" uuid,
	"kind" "blog_comment_kind" DEFAULT 'comment' NOT NULL,
	"body" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_author_id_blog_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."blog_authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_authors" ADD CONSTRAINT "blog_authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_authors" ADD CONSTRAINT "blog_authors_photo_media_id_media_id_fk" FOREIGN KEY ("photo_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_article_id_blog_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."blog_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_revisions" ADD CONSTRAINT "blog_revisions_article_id_blog_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."blog_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_revisions" ADD CONSTRAINT "blog_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_articles_slug_unique" ON "blog_articles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_articles_published_slug_unique" ON "blog_articles" USING btree (("published_snapshot" ->> 'slug')) WHERE "blog_articles"."status" = 'published';--> statement-breakpoint
CREATE INDEX "blog_articles_status_published_idx" ON "blog_articles" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "blog_articles_category_idx" ON "blog_articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "blog_articles_author_idx" ON "blog_articles" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "blog_articles_created_by_idx" ON "blog_articles" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "blog_articles_updated_idx" ON "blog_articles" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "blog_articles_scheduled_idx" ON "blog_articles" USING btree ("scheduled_at") WHERE "blog_articles"."status" = 'scheduled';--> statement-breakpoint
CREATE INDEX "blog_articles_search_idx" ON "blog_articles" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_authors_slug_unique" ON "blog_authors" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_authors_user_unique" ON "blog_authors" USING btree ("user_id") WHERE "blog_authors"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_categories_slug_unique" ON "blog_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_comments_article_idx" ON "blog_comments" USING btree ("article_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_revisions_article_number_unique" ON "blog_revisions" USING btree ("article_id","number");--> statement-breakpoint
CREATE INDEX "blog_revisions_article_idx" ON "blog_revisions" USING btree ("article_id","created_at" DESC NULLS LAST);--> statement-breakpoint
-- Permissões do Blog. O seed também sincroniza o catálogo, mas as funções que já existem no banco
-- só recebem permissões novas por aqui (o seed não altera funções existentes).
INSERT INTO "permissions" ("key", "description") VALUES
  ('blog.view', 'Acessar o Blog no Studio'),
  ('blog.create', 'Criar artigos'),
  ('blog.edit_own', 'Editar os próprios artigos e enviar para revisão'),
  ('blog.edit_any', 'Editar artigos de qualquer autor'),
  ('blog.review', 'Ver a fila de revisão e comentar artigos'),
  ('blog.approve', 'Aprovar artigos e devolver com comentários'),
  ('blog.publish', 'Publicar, agendar e despublicar artigos'),
  ('blog.delete', 'Excluir artigos'),
  ('blog.categories', 'Gerenciar categorias do Blog'),
  ('blog.authors', 'Gerenciar autores do Blog')
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
-- Owner, Administrador e Editor: o módulo inteiro.
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" IN ('owner', 'admin', 'editor') AND p."key" LIKE 'blog.%'
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Colaborador: escreve e envia para revisão, sem publicar (mesma regra que já vale para landing e projetos).
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'collaborator' AND p."key" IN ('blog.view', 'blog.create', 'blog.edit_own')
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Colunista: profissional externo que escreve para o Blog. Vê só o Blog e a própria conta.
INSERT INTO "roles" ("key", "name", "description", "is_system")
VALUES ('columnist', 'Colunista', 'Escreve artigos para o Blog e envia para revisão. Vê só o Blog e a própria conta.', false)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'columnist' AND p."key" IN ('blog.view', 'blog.create', 'blog.edit_own')
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Categorias iniciais (editáveis no Studio).
INSERT INTO "blog_categories" ("slug", "name", "description", "sort_order") VALUES
  ('inteligencia-artificial', 'Inteligência Artificial', 'Como a IA muda produtos, processos e decisões nas empresas.', 1),
  ('ciberseguranca', 'Cibersegurança', 'Proteção de dados, contas e sistemas, sem alarmismo.', 2),
  ('desenvolvimento', 'Desenvolvimento', 'Arquitetura, engenharia e boas práticas para software que dura.', 3),
  ('tendencias', 'Tendências', 'Tecnologias que estão saindo do laboratório e chegando à operação.', 4),
  ('negocios', 'Negócios', 'Tecnologia do ponto de vista de quem decide e investe.', 5),
  ('rocket-vision', 'Rocket Vision', 'Como trabalhamos e o que aprendemos construindo produtos.', 6)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
-- Autor institucional para conteúdo da equipe.
INSERT INTO "blog_authors" ("slug", "name", "role_title", "bio", "affiliation")
VALUES ('redacao-rocket-vision', 'Redação Rocket Vision', 'Equipe editorial', 'Artigos escritos e revisados pela equipe da Rocket Vision.', 'team')
ON CONFLICT DO NOTHING;
