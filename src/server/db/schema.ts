/**
 * Schema do banco do CMS.
 *
 * Convenções:
 * - Chaves primárias UUID (gen_random_uuid) para recursos expostos em URLs, evitando IDs sequenciais adivinháveis.
 * - Timestamps sempre com fuso (timestamptz).
 * - Cascade só onde o filho não faz sentido sem o pai (sessões, tokens, imagens de um projeto).
 * - Referências a usuários em conteúdo e auditoria usam SET NULL: desativar ou remover alguém não apaga histórico.
 * - Campo `version` em conteúdo editável: controle de concorrência otimista (detecta edição simultânea).
 */

import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigserial,
  customType,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* -------------------------------------------------------------------------- */
/* Acesso: usuários, funções e permissões                                      */
/* -------------------------------------------------------------------------- */

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** Funções de sistema (ex.: owner) não podem ser removidas nem perder permissões pela interface. */
    isSystem: boolean("is_system").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("roles_key_unique").on(t.key)],
);

/** Catálogo de permissões. As chaves são definidas em código (src/server/authz/permissions.ts) e sincronizadas pelo seed. */
export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

export const userStatus = pgEnum("user_status", ["invited", "active", "disabled"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    /** Hash Argon2id no formato PHC. Nulo enquanto o convite não for aceito. */
    passwordHash: text("password_hash"),
    status: userStatus("status").notNull().default("invited"),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    createdBy: uuid("created_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_email_unique").on(sql`lower(${t.email})`),
    index("users_role_idx").on(t.roleId),
    check("users_active_has_password", sql`${t.status} <> 'active' OR ${t.passwordHash} IS NOT NULL`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 (hex) do token do cookie. O token em si nunca é armazenado. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const userTokenType = pgEnum("user_token_type", ["invite", "password_reset"]);

/** Tokens de uso único (convite e redefinição de senha). Guardamos só o hash. */
export const userTokens = pgTable(
  "user_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: userTokenType("type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_tokens_user_idx").on(t.userId, t.type)],
);

/* -------------------------------------------------------------------------- */
/* Mídia                                                                       */
/* -------------------------------------------------------------------------- */

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Caminho no object storage. Gerado pelo servidor, nunca vem do cliente. */
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    alt: text("alt").notNull().default(""),
    /** Nome original saneado, apenas para exibição. */
    filename: text("filename").notNull(),
    sha256: text("sha256").notNull(),
    /** Placeholder de blur (data URL pequena) gerado no upload. */
    blurDataUrl: text("blur_data_url"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("media_storage_key_unique").on(t.storageKey),
    index("media_created_idx").on(t.createdAt),
    index("media_sha256_idx").on(t.sha256),
    check("media_size_positive", sql`${t.sizeBytes} > 0 AND ${t.width} > 0 AND ${t.height} > 0`),
  ],
);

/**
 * Onde cada mídia é usada. Reconstruído a cada gravação de conteúdo.
 * Permite mostrar "usada em" e impedir a remoção de uma imagem em uso (FK restrict).
 */
export const mediaUsages = pgTable(
  "media_usages",
  {
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    field: text("field").notNull(),
    label: text("label").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.mediaId, t.resourceType, t.resourceId, t.field] }),
    index("media_usages_resource_idx").on(t.resourceType, t.resourceId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Conteúdo da landing e configurações do site                                 */
/* -------------------------------------------------------------------------- */

/**
 * Cada seção da landing (e as configurações do site) é um registro com duas versões:
 * rascunho (o que o editor está trabalhando) e publicada (o que o site mostra).
 * O conteúdo é JSONB porque cada seção tem uma forma própria, validada por schema Zod
 * no servidor (src/lib/content/schemas.ts) antes de qualquer gravação.
 */
export const contentSections = pgTable("content_sections", {
  key: text("key").primaryKey(),
  draft: jsonb("draft").notNull(),
  published: jsonb("published"),
  version: integer("version").notNull().default(1),
  draftUpdatedAt: timestamp("draft_updated_at", { withTimezone: true }).notNull().defaultNow(),
  draftUpdatedBy: uuid("draft_updated_by").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
});

/* -------------------------------------------------------------------------- */
/* Projetos                                                                    */
/* -------------------------------------------------------------------------- */

export const projectStatus = pgEnum("project_status", ["draft", "published", "archived"]);
export const projectTone = pgEnum("project_tone", ["light", "dark"]);
export const projectImageRole = pgEnum("project_image_role", ["desktop", "mobile", "gallery"]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    client: text("client").notNull().default(""),
    category: text("category").notNull(),
    /** Data de entrega/lançamento (dia do calendário, sem fuso). */
    projectDate: date("project_date"),
    summary: text("summary").notNull(),
    description: text("description").notNull().default(""),
    context: text("context").notNull().default(""),
    solution: text("solution").notNull().default(""),
    results: text("results").notNull().default(""),
    services: text("services").array().notNull().default(sql`'{}'::text[]`),
    highlights: text("highlights").array().notNull().default(sql`'{}'::text[]`),
    /** Cor de fundo da cena do projeto. */
    brandColor: text("brand_color").notNull(),
    /** Cor de destaque (categoria, marcadores). */
    accentColor: text("accent_color").notNull(),
    /** Tom do texto sobre a cor da marca. */
    tone: projectTone("tone").notNull(),
    coverMediaId: uuid("cover_media_id").references(() => media.id, { onDelete: "restrict" }),
    logoMediaId: uuid("logo_media_id").references(() => media.id, { onDelete: "restrict" }),
    ogMediaId: uuid("og_media_id").references(() => media.id, { onDelete: "restrict" }),
    externalUrl: text("external_url").notNull().default(""),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    status: projectStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Projeto de exemplo (mostra selo e não entra no índice de buscadores). */
    isSample: boolean("is_sample").notNull().default(false),
    /**
     * Versão publicada, congelada no momento da publicação. O site público lê só isto:
     * editar um projeto publicado não altera o site até "Publicar alterações".
     */
    publishedSnapshot: jsonb("published_snapshot"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("projects_slug_unique").on(t.slug),
    // O endereço público vem da versão publicada: dois projetos publicados nunca disputam a mesma URL.
    uniqueIndex("projects_published_slug_unique")
      .on(sql`(${t.publishedSnapshot} ->> 'slug')`)
      .where(sql`${t.status} = 'published'`),
    index("projects_status_order_idx").on(t.status, t.sortOrder),
    index("projects_updated_idx").on(t.updatedAt),
    index("projects_cover_media_idx").on(t.coverMediaId),
    check("projects_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("projects_colors_hex", sql`${t.brandColor} ~ '^#[0-9a-f]{6}$' AND ${t.accentColor} ~ '^#[0-9a-f]{6}$'`),
    check(
      "projects_published_has_snapshot",
      sql`${t.status} <> 'published' OR ${t.publishedSnapshot} IS NOT NULL`,
    ),
  ],
);

export const projectImages = pgTable(
  "project_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    role: projectImageRole("role").notNull(),
    position: smallint("position").notNull().default(0),
    caption: text("caption").notNull().default(""),
  },
  (t) => [
    index("project_images_project_idx").on(t.projectId, t.role, t.position),
    index("project_images_media_idx").on(t.mediaId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Blog                                                                        */
/* -------------------------------------------------------------------------- */

/** Vetor de busca textual do Postgres (calculado na publicação, a partir da versão publicada). */
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

/** `team`: gente da Rocket. `guest`: colunista convidado, que não é apresentado como funcionário. */
export const blogAffiliation = pgEnum("blog_affiliation", ["team", "guest"]);

/**
 * Estados do fluxo editorial:
 * rascunho → em revisão → aprovado → agendado ou publicado → arquivado.
 * As transições permitidas ficam em src/lib/blog/workflow.ts e são validadas no servidor.
 */
export const blogStatus = pgEnum("blog_status", ["draft", "in_review", "approved", "scheduled", "published", "archived"]);

export const blogCommentKind = pgEnum("blog_comment_kind", ["comment", "changes_requested"]);

export const blogAuthors = pgTable(
  "blog_authors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Conta do Studio ligada ao perfil (opcional: a Redação, por exemplo, não é uma pessoa). */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Cargo ou especialidade exibido junto ao nome. */
    roleTitle: text("role_title").notNull().default(""),
    bio: text("bio").notNull().default(""),
    photoMediaId: uuid("photo_media_id").references(() => media.id, { onDelete: "restrict" }),
    /** Links profissionais: [{ label, url }], só https. */
    links: jsonb("links").notNull().default(sql`'[]'::jsonb`),
    affiliation: blogAffiliation("affiliation").notNull().default("guest"),
    isActive: boolean("is_active").notNull().default(true),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("blog_authors_slug_unique").on(t.slug),
    uniqueIndex("blog_authors_user_unique").on(t.userId).where(sql`${t.userId} IS NOT NULL`),
    check("blog_authors_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("blog_categories_slug_unique").on(t.slug),
    check("blog_categories_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);

export const blogArticles = pgTable(
  "blog_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    /** Resumo curto: listagens, busca e descrição padrão para buscadores. */
    excerpt: text("excerpt").notNull().default(""),
    /** Documento do editor (JSON validado por src/lib/blog/document.ts). Nunca HTML. */
    content: jsonb("content").notNull(),
    categoryId: uuid("category_id").references(() => blogCategories.id, { onDelete: "restrict" }),
    authorId: uuid("author_id").references(() => blogAuthors.id, { onDelete: "restrict" }),
    coverMediaId: uuid("cover_media_id").references(() => media.id, { onDelete: "restrict" }),
    coverAlt: text("cover_alt").notNull().default(""),
    coverCaption: text("cover_caption").notNull().default(""),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    featured: boolean("featured").notNull().default(false),
    readingMinutes: integer("reading_minutes").notNull().default(1),
    status: blogStatus("status").notNull().default("draft"),
    /** Data e hora da publicação agendada (status `scheduled`). */
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    /**
     * Versão publicada, congelada na publicação. O site público lê só isto:
     * editar um artigo publicado não muda o site até publicar de novo.
     */
    publishedSnapshot: jsonb("published_snapshot"),
    /** Busca pública: calculada a partir da versão publicada. */
    searchVector: tsvector("search_vector"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
    publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("blog_articles_slug_unique").on(t.slug),
    // O endereço público vem da versão publicada: dois artigos no ar nunca disputam a mesma URL.
    uniqueIndex("blog_articles_published_slug_unique")
      .on(sql`(${t.publishedSnapshot} ->> 'slug')`)
      .where(sql`${t.status} = 'published'`),
    index("blog_articles_status_published_idx").on(t.status, t.publishedAt.desc()),
    index("blog_articles_category_idx").on(t.categoryId),
    index("blog_articles_author_idx").on(t.authorId),
    index("blog_articles_created_by_idx").on(t.createdBy),
    index("blog_articles_updated_idx").on(t.updatedAt.desc()),
    index("blog_articles_scheduled_idx").on(t.scheduledAt).where(sql`${t.status} = 'scheduled'`),
    index("blog_articles_search_idx").using("gin", t.searchVector),
    check("blog_articles_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("blog_articles_published_has_snapshot", sql`${t.status} <> 'published' OR ${t.publishedSnapshot} IS NOT NULL`),
    check("blog_articles_scheduled_has_date", sql`${t.status} <> 'scheduled' OR ${t.scheduledAt} IS NOT NULL`),
    check("blog_articles_reading_positive", sql`${t.readingMinutes} > 0`),
  ],
);

/** Histórico de versões de um artigo: cada marco do fluxo e salvamentos relevantes. Restaurar cria uma nova revisão. */
export const blogRevisions = pgTable(
  "blog_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => blogArticles.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    /** Conteúdo e metadados editáveis no momento da revisão. */
    snapshot: jsonb("snapshot").notNull(),
    /** save, submit, approve, publish, restore, schedule. */
    reason: text("reason").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("blog_revisions_article_number_unique").on(t.articleId, t.number), index("blog_revisions_article_idx").on(t.articleId, t.createdAt.desc())],
);

/** Comentários editoriais (inclusive a devolução com pedido de ajustes). Nunca aparecem no site. */
export const blogComments = pgTable(
  "blog_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => blogArticles.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    kind: blogCommentKind("kind").notNull().default("comment"),
    body: text("body").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blog_comments_article_idx").on(t.articleId, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* Auditoria e rate limit                                                      */
/* -------------------------------------------------------------------------- */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    /** Cópia do e-mail no momento do evento: o histórico continua legível mesmo se o usuário mudar. */
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    summary: text("summary").notNull(),
    /** Antes e depois, já sem campos sensíveis. */
    changes: jsonb("changes"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt.desc()),
    index("audit_logs_actor_idx").on(t.actorId, t.createdAt.desc()),
    index("audit_logs_resource_idx").on(t.resourceType, t.resourceId),
    index("audit_logs_action_idx").on(t.action),
  ],
);

/** Contadores de janela fixa para rate limiting, compartilhados entre todas as instâncias. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limits_expires_idx").on(t.expiresAt)],
);

/**
 * Diagnósticos enviados pelo quiz do site (substitui o formulário de contato). Cada linha é um lead:
 * quem é, o negócio, as respostas e o WhatsApp. `handledAt` marca quando a equipe já retornou.
 */
export const diagnostics = pgTable(
  "diagnostics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    business: text("business").notNull(),
    segment: text("segment").notNull(),
    presence: text("presence").notNull(),
    problems: jsonb("problems").$type<string[]>().notNull(),
    timing: text("timing").notNull(),
    whatsapp: text("whatsapp").notNull(),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    handledAt: timestamp("handled_at", { withTimezone: true }),
  },
  (t) => [index("diagnostics_created_idx").on(t.createdAt)],
);
