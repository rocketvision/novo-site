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
  bigint,
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
    /** Projeto conceitual/de exemplo (mostra o selo "Projeto conceitual" e não entra no índice de buscadores). */
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
 * quem é, o negócio, as respostas e o WhatsApp. A equipe acompanha pela etapa (`status`, ver
 * DIAGNOSTIC_STATUSES em src/lib/diagnostic.ts) e pelas anotações.
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
    status: text("status").notNull().default("novo"),
    notes: text("notes").notNull().default(""),
    /** Como a pessoa escolheu seguir no fim do quiz: agendou, vai chamar no WhatsApp ou aguarda (ver CONTACT_PREFERENCES). */
    contactPreference: text("contact_preference"),
    /** Hash do token devolvido só para quem enviou o diagnóstico: é o que permite agendar a call por ele. */
    bookingTokenHash: text("booking_token_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  },
  (t) => [
    index("diagnostics_created_idx").on(t.createdAt),
    index("diagnostics_status_idx").on(t.status, t.createdAt),
    check("diagnostics_status_check", sql`${t.status} in ('novo', 'em_contato', 'call_agendada', 'proposta', 'fechado', 'descartado')`),
  ],
);

/**
 * Conexão com o Google Calendar (uma só, id "default"): a conta que recebe as calls. O refresh token
 * fica criptografado (AES-GCM) com uma chave derivada de GOOGLE_CLIENT_SECRET.
 */
export const googleCalendarConnection = pgTable("google_calendar_connection", {
  id: text("id").primaryKey().default("default"),
  email: text("email").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  calendarId: text("calendar_id").notNull().default("primary"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  connectedBy: uuid("connected_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
});

/** Calls agendadas pelo site. Um horário só pode ter uma call confirmada (índice único parcial). */
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    diagnosticId: uuid("diagnostic_id").references((): AnyPgColumn => diagnostics.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    business: text("business").notNull(),
    whatsapp: text("whatsapp").notNull(),
    email: text("email"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** "confirmado" ou "cancelado". Enquanto o evento é criado no Google, fica "reservando". */
    status: text("status").notNull().default("reservando"),
    googleEventId: text("google_event_id"),
    meetUrl: text("meet_url"),
    eventUrl: text("event_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("bookings_slot_unique").on(t.startsAt).where(sql`${t.status} <> 'cancelado'`),
    index("bookings_starts_idx").on(t.startsAt),
    index("bookings_diagnostic_idx").on(t.diagnosticId),
    check("bookings_status_check", sql`${t.status} in ('reservando', 'confirmado', 'cancelado')`),
  ],
);

/** Horários e dias marcados como indisponíveis pelo CMS, por qualquer motivo. */
export const availabilityBlocks = pgTable(
  "availability_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  },
  (t) => [index("availability_blocks_range_idx").on(t.startsAt, t.endsAt), check("availability_blocks_range_check", sql`${t.endsAt} > ${t.startsAt}`)],
);

/* ========================================================================== */
/* Rocket Alliance: programa de parcerias                                      */
/* ========================================================================== */

/*
 * Convenções do módulo:
 * - Dinheiro sempre em centavos inteiros (bigint) e taxas em pontos-base (500 = 5%). Nada em float.
 * - Pessoas das empresas parceiras (Alliance Hub) têm identidade própria (partner_users), separada dos
 *   usuários do CMS: nenhuma conta de parceiro entra no CMS, nenhuma conta do CMS entra no Hub.
 * - Todo dado de parceiro carrega partner_id: é por ele que o Hub isola uma empresa da outra.
 * - Registros financeiros nunca são apagados: estornos, cancelamentos e ajustes viram novos lançamentos.
 */

const money = (name: string) => bigint(name, { mode: "number" });

/** Modalidades oficiais (como o parceiro atua). Chaves fixas; nome e descrição editáveis. */
export const partnerModalities = pgTable("partner_modalities", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: smallint("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Níveis de reconhecimento (quais benefícios o parceiro tem). `rank` ordena Member < Pro < Elite. */
export const partnerTiers = pgTable(
  "partner_tiers",
  {
    key: text("key").primaryKey(),
    name: text("name").notNull(),
    rank: smallint("rank").notNull(),
    label: text("label").notNull().default(""),
    description: text("description").notNull(),
    benefits: jsonb("benefits").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("partner_tiers_rank_unique").on(t.rank)],
);

/** Candidaturas enviadas pela página /partners. Entram como pending_review; nunca criam acesso ao Hub sozinhas. */
export const partnerApplications = pgTable(
  "partner_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    company: text("company").notNull(),
    email: text("email").notNull(),
    website: text("website").notNull().default(""),
    phone: text("phone").notNull(),
    sector: text("sector").notNull(),
    modalityKey: text("modality_key")
      .notNull()
      .references(() => partnerModalities.key, { onDelete: "restrict", onUpdate: "cascade" }),
    companyDescription: text("company_description").notNull(),
    interest: text("interest").notNull(),
    /** Consentimento (LGPD) para tratar os dados da candidatura: obrigatório. */
    consentPrivacy: boolean("consent_privacy").notNull(),
    /** Aceite para receber comunicações do programa: opcional. */
    consentMarketing: boolean("consent_marketing").notNull().default(false),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").notNull().default("pending_review"),
    /** Motivo da recusa ou pedido de informações (vai para a pessoa por e-mail). */
    decisionMessage: text("decision_message").notNull().default(""),
    internalNotes: text("internal_notes").notNull().default(""),
    partnerId: uuid("partner_id").references((): AnyPgColumn => partners.id, { onDelete: "set null" }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("partner_applications_status_idx").on(t.status, t.createdAt.desc()),
    index("partner_applications_email_idx").on(sql`lower(${t.email})`),
    check("partner_applications_status_check", sql`${t.status} in ('pending_review', 'info_requested', 'approved', 'rejected')`),
    check("partner_applications_consent_check", sql`${t.consentPrivacy} = true`),
  ],
);

/** Histórico de cada candidatura (envio, pedidos de informação, decisão, anotações). */
export const partnerApplicationEvents = pgTable(
  "partner_application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => partnerApplications.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    message: text("message").notNull().default(""),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("partner_application_events_app_idx").on(t.applicationId, t.createdAt)],
);

/**
 * Empresas parceiras: cadastro interno (razão social, contatos, situação, nível) e perfil público
 * (logos, textos, setor, especialidades). O site lê só `published_snapshot`, congelado ao publicar.
 * Aparece no diretório apenas com situação ativa, publicação habilitada e snapshot presente.
 */
export const partners = pgTable(
  "partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    tradeName: text("trade_name").notNull(),
    legalName: text("legal_name").notNull().default(""),
    taxId: text("tax_id").notNull().default(""),
    status: text("status").notNull().default("onboarding"),
    tierKey: text("tier_key")
      .notNull()
      .default("member")
      .references(() => partnerTiers.key, { onDelete: "restrict", onUpdate: "cascade" }),
    // Contato principal: interno, nunca publicado.
    contactName: text("contact_name").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),
    // Perfil público.
    sector: text("sector").notNull().default(""),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    specialties: text("specialties").array().notNull().default(sql`'{}'::text[]`),
    services: text("services").array().notNull().default(sql`'{}'::text[]`),
    websiteUrl: text("website_url").notNull().default(""),
    socialLinks: jsonb("social_links").$type<{ label: string; url: string }[]>().notNull().default(sql`'[]'::jsonb`),
    location: text("location").notNull().default(""),
    logoMediaId: uuid("logo_media_id").references(() => media.id, { onDelete: "restrict" }),
    /** Logo alternativo, para fundos escuros. */
    logoAltMediaId: uuid("logo_alt_media_id").references(() => media.id, { onDelete: "restrict" }),
    coverMediaId: uuid("cover_media_id").references(() => media.id, { onDelete: "restrict" }),
    ogMediaId: uuid("og_media_id").references(() => media.id, { onDelete: "restrict" }),
    /** Cor de destaque da página exclusiva (identidade própria dentro do Design System). */
    accentColor: text("accent_color").notNull().default("#2c9df5"),
    testimonials: jsonb("testimonials").$type<{ quote: string; author: string; role: string; approved: boolean }[]>().notNull().default(sql`'[]'::jsonb`),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    /** Mostrar o nível no site (só com autorização). */
    showTier: boolean("show_tier").notNull().default(false),
    /** Publicação habilitada no diretório e na página exclusiva. */
    directoryEnabled: boolean("directory_enabled").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Com a opção, o Partner Manager também convida membros para a equipe. */
    managersInvite: boolean("managers_invite").notNull().default(false),
    // Avaliação para evolução de nível (não depende só do faturamento).
    qualityScore: smallint("quality_score"),
    satisfactionScore: smallint("satisfaction_score"),
    complianceOk: boolean("compliance_ok").notNull().default(true),
    internalNotes: text("internal_notes").notNull().default(""),
    applicationId: uuid("application_id"),
    publishedSnapshot: jsonb("published_snapshot"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("partners_slug_unique").on(t.slug),
    index("partners_status_idx").on(t.status),
    index("partners_directory_idx").on(t.directoryEnabled, t.featured, t.sortOrder),
    check("partners_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("partners_status_check", sql`${t.status} in ('onboarding', 'active', 'suspended', 'terminated')`),
    check("partners_accent_hex", sql`${t.accentColor} ~ '^#[0-9a-f]{6}$'`),
    check("partners_scores_range", sql`(${t.qualityScore} IS NULL OR ${t.qualityScore} BETWEEN 1 AND 5) AND (${t.satisfactionScore} IS NULL OR ${t.satisfactionScore} BETWEEN 1 AND 5)`),
  ],
);

/** Modalidades autorizadas para cada parceiro (pode ter mais de uma, com aprovação). */
export const partnerModalityLinks = pgTable(
  "partner_modality_links",
  {
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    modalityKey: text("modality_key")
      .notNull()
      .references(() => partnerModalities.key, { onDelete: "restrict", onUpdate: "cascade" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.partnerId, t.modalityKey] })],
);

/** Galeria de imagens do parceiro (biblioteca de mídia do CMS). */
export const partnerMedia = pgTable(
  "partner_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: smallint("position").notNull().default(0),
    caption: text("caption").notNull().default(""),
  },
  (t) => [index("partner_media_partner_idx").on(t.partnerId, t.position), index("partner_media_media_idx").on(t.mediaId)],
);

/** Projetos conjuntos: ligação com os projetos do portfólio já existentes. */
export const partnerProjects = pgTable(
  "partner_projects",
  {
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.partnerId, t.projectId] })],
);

/** Conteúdo em blocos da página exclusiva (/partners/[slug]). Publicado junto com o perfil. */
export const partnerPages = pgTable("partner_pages", {
  partnerId: uuid("partner_id")
    .primaryKey()
    .references(() => partners.id, { onDelete: "cascade" }),
  content: jsonb("content").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Alterações de dados públicos pedidas pelo parceiro no Hub: só valem depois da aprovação da Rocket. */
export const partnerChangeRequests = pgTable(
  "partner_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by").references((): AnyPgColumn => partnerUsers.id, { onDelete: "set null" }),
    changes: jsonb("changes").notNull(),
    status: text("status").notNull().default("pending"),
    reviewNote: text("review_note").notNull().default(""),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("partner_change_requests_partner_idx").on(t.partnerId, t.createdAt.desc()),
    index("partner_change_requests_status_idx").on(t.status),
    check("partner_change_requests_status_check", sql`${t.status} in ('pending', 'approved', 'rejected', 'withdrawn')`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Alliance Hub: contas das empresas parceiras                                 */
/* -------------------------------------------------------------------------- */

/** Pessoas de uma empresa parceira. Cada conta pertence a uma única empresa. */
export const partnerUsers = pgTable(
  "partner_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull().default("member"),
    /** Argon2id (PHC). Nulo enquanto o convite não for aceito. */
    passwordHash: text("password_hash"),
    status: text("status").notNull().default("invited"),
    /** Aceitar o convite (link enviado ao e-mail) comprova o endereço. */
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    /** Segredo TOTP cifrado (AES-GCM). Só vale com totp_enabled_at preenchido. */
    totpSecretEnc: text("totp_secret_enc"),
    totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
    /** Hashes SHA-256 dos códigos de recuperação ainda não usados. */
    recoveryCodes: jsonb("recovery_codes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    invitedByPartnerUserId: uuid("invited_by_partner_user_id").references((): AnyPgColumn => partnerUsers.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("partner_users_email_unique").on(sql`lower(${t.email})`),
    index("partner_users_partner_idx").on(t.partnerId),
    check("partner_users_role_check", sql`${t.role} in ('owner', 'manager', 'member')`),
    check("partner_users_status_check", sql`${t.status} in ('invited', 'active', 'disabled')`),
    check("partner_users_active_has_password", sql`${t.status} <> 'active' OR ${t.passwordHash} IS NOT NULL`),
  ],
);

/** Sessões do Hub, no mesmo padrão das do CMS: o banco guarda só o SHA-256 do token. */
export const partnerSessions = pgTable(
  "partner_sessions",
  {
    id: text("id").primaryKey(),
    partnerUserId: uuid("partner_user_id")
      .notNull()
      .references(() => partnerUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("partner_sessions_user_idx").on(t.partnerUserId), index("partner_sessions_expires_idx").on(t.expiresAt)],
);

/** Tokens de uso único do Hub: convite, redefinição de senha, troca de e-mail e segundo fator do login. */
export const partnerUserTokens = pgTable(
  "partner_user_tokens",
  {
    id: text("id").primaryKey(),
    partnerUserId: uuid("partner_user_id")
      .notNull()
      .references(() => partnerUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    /** Dado extra do token (ex.: o novo e-mail). Nunca segredos. */
    payload: jsonb("payload"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("partner_user_tokens_user_idx").on(t.partnerUserId, t.type),
    check("partner_user_tokens_type_check", sql`${t.type} in ('invite', 'password_reset', 'email_change', 'login_challenge')`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Indicações                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Indicações registradas pelos parceiros. `code` é o identificador exibido (RA-000123); a URL usa o
 * UUID e toda leitura no Hub filtra pela empresa. A proteção da oportunidade vale até `protected_until`.
 */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().default(sql`'RA-' || lpad(nextval('referral_code_seq')::text, 6, '0')`),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    submittedBy: uuid("submitted_by").references(() => partnerUsers.id, { onDelete: "set null" }),
    companyName: text("company_name").notNull(),
    companyWebsite: text("company_website").notNull().default(""),
    companyTaxId: text("company_tax_id"),
    companyDomain: text("company_domain"),
    companyNameKey: text("company_name_key"),
    contactName: text("contact_name").notNull(),
    contactRole: text("contact_role").notNull().default(""),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull().default(""),
    city: text("city").notNull().default(""),
    need: text("need").notNull(),
    services: text("services").array().notNull().default(sql`'{}'::text[]`),
    /** Estimativa do parceiro (informativa). */
    estimatedValueCents: money("estimated_value_cents"),
    /** Valor do contrato fechado, informado pela Rocket ao marcar como Won. */
    dealValueCents: money("deal_value_cents"),
    /** O parceiro confirma que o cliente autorizou o contato (LGPD). */
    consentConfirmed: boolean("consent_confirmed").notNull(),
    status: text("status").notNull().default("submitted"),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    protectedUntil: timestamp("protected_until", { withTimezone: true }).notNull(),
    lostReason: text("lost_reason").notNull().default(""),
    internalNotes: text("internal_notes").notNull().default(""),
    /**
     * Mesmo nome de empresa de outra indicação ainda protegida (sem domínio ou CNPJ em comum): entra,
     * mas marcada para a equipe decidir a atribuição. Domínio ou CNPJ iguais são recusados na hora.
     */
    possibleDuplicateOf: uuid("possible_duplicate_of").references((): AnyPgColumn => referrals.id, { onDelete: "set null" }),
    wonAt: timestamp("won_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("referrals_code_unique").on(t.code),
    index("referrals_partner_idx").on(t.partnerId, t.createdAt.desc()),
    index("referrals_status_idx").on(t.status, t.createdAt.desc()),
    index("referrals_domain_idx").on(t.companyDomain),
    index("referrals_tax_id_idx").on(t.companyTaxId),
    index("referrals_name_key_idx").on(t.companyNameKey),
    check(
      "referrals_status_check",
      sql`${t.status} in ('submitted', 'under_review', 'qualified', 'in_negotiation', 'won', 'lost', 'cancelled')`,
    ),
    check("referrals_consent_check", sql`${t.consentConfirmed} = true`),
    check("referrals_values_positive", sql`(${t.estimatedValueCents} IS NULL OR ${t.estimatedValueCents} >= 0) AND (${t.dealValueCents} IS NULL OR ${t.dealValueCents} >= 0)`),
  ],
);

/** Histórico de status e observações de cada indicação. `visible_to_partner` controla o que o Hub mostra. */
export const referralEvents = pgTable(
  "referral_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referralId: uuid("referral_id")
      .notNull()
      .references(() => referrals.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    note: text("note").notNull().default(""),
    visibleToPartner: boolean("visible_to_partner").notNull().default(true),
    actorType: text("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorPartnerUserId: uuid("actor_partner_user_id").references(() => partnerUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("referral_events_referral_idx").on(t.referralId, t.createdAt),
    check("referral_events_actor_check", sql`${t.actorType} in ('partner', 'cms', 'system')`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Oportunidades                                                               */
/* -------------------------------------------------------------------------- */

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    kind: text("kind").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("draft"),
    deadline: date("deadline"),
    minTierRank: smallint("min_tier_rank").notNull().default(1),
    modalities: text("modalities").array().notNull().default(sql`'{}'::text[]`),
    partnerIds: uuid("partner_ids").array().notNull().default(sql`'{}'::uuid[]`),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("opportunities_status_idx").on(t.status, t.createdAt.desc()),
    check("opportunities_status_check", sql`${t.status} in ('draft', 'open', 'closed')`),
  ],
);

/** Manifestações de interesse de um parceiro em uma oportunidade (uma por empresa). */
export const opportunityInterests = pgTable(
  "opportunity_interests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    partnerUserId: uuid("partner_user_id").references(() => partnerUsers.id, { onDelete: "set null" }),
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("sent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("opportunity_interests_unique").on(t.opportunityId, t.partnerId),
    check("opportunity_interests_status_check", sql`${t.status} in ('sent', 'accepted', 'declined')`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Comissões                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Regras de comissão. Nenhum percentual fica no código: a regra aplicada a um recebimento é a
 * aprovada e vigente mais específica (do parceiro > nível + modalidade > nível > geral).
 * `recurring_months`: em serviços recorrentes, quantas mensalidades pagas geram participação.
 */
export const commissionRules = pgTable(
  "commission_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    partnerId: uuid("partner_id").references(() => partners.id, { onDelete: "cascade" }),
    tierKey: text("tier_key").references(() => partnerTiers.key, { onDelete: "restrict", onUpdate: "cascade" }),
    modalityKey: text("modality_key").references(() => partnerModalities.key, { onDelete: "restrict", onUpdate: "cascade" }),
    scope: text("scope").notNull().default("all"),
    rateBp: integer("rate_bp").notNull(),
    recurringMonths: smallint("recurring_months").notNull().default(12),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    status: text("status").notNull().default("draft"),
    /** Se a taxa pode aparecer na página pública (só regras gerais por nível). */
    isPublic: boolean("is_public").notNull().default(false),
    notes: text("notes").notNull().default(""),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    index("commission_rules_lookup_idx").on(t.status, t.partnerId, t.tierKey),
    check("commission_rules_rate_range", sql`${t.rateBp} BETWEEN 0 AND 10000`),
    check("commission_rules_months_range", sql`${t.recurringMonths} BETWEEN 0 AND 120`),
    check("commission_rules_scope_check", sql`${t.scope} in ('all', 'one_time', 'recurring')`),
    check("commission_rules_status_check", sql`${t.status} in ('draft', 'approved', 'archived')`),
    check("commission_rules_dates_check", sql`${t.validTo} IS NULL OR ${t.validTo} >= ${t.validFrom}`),
  ],
);

/**
 * Recebimentos da Rocket ligados a uma indicação ganha: a base das comissões (receita líquida elegível
 * efetivamente recebida). Reembolso é um recebimento do tipo "refund" que aponta para o original.
 * `external_ref` único torna idempotente o registro vindo de uma integração (ou de um clique repetido).
 */
export const revenueReceipts = pgTable(
  "revenue_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referralId: uuid("referral_id")
      .notNull()
      .references(() => referrals.id, { onDelete: "restrict" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    installmentNumber: smallint("installment_number"),
    amountCents: money("amount_cents").notNull(),
    receivedOn: date("received_on").notNull(),
    refundOf: uuid("refund_of").references((): AnyPgColumn => revenueReceipts.id, { onDelete: "restrict" }),
    description: text("description").notNull().default(""),
    externalRef: text("external_ref"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("revenue_receipts_referral_idx").on(t.referralId, t.receivedOn),
    uniqueIndex("revenue_receipts_external_unique").on(t.externalRef).where(sql`${t.externalRef} IS NOT NULL`),
    uniqueIndex("revenue_receipts_installment_unique").on(t.referralId, t.installmentNumber).where(sql`${t.kind} = 'recurring'`),
    check("revenue_receipts_kind_check", sql`${t.kind} in ('one_time', 'recurring', 'refund')`),
    check("revenue_receipts_amount_positive", sql`${t.amountCents} > 0`),
    check("revenue_receipts_installment_check", sql`(${t.kind} = 'recurring') = (${t.installmentNumber} IS NOT NULL) AND (${t.installmentNumber} IS NULL OR ${t.installmentNumber} >= 1)`),
    check("revenue_receipts_refund_check", sql`(${t.kind} = 'refund') = (${t.refundOf} IS NOT NULL)`),
  ],
);

/** Pagamentos feitos pela Rocket aos parceiros, somando lançamentos aprovados. */
export const partnerPayouts = pgTable(
  "partner_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    amountCents: money("amount_cents").notNull(),
    paidOn: date("paid_on").notNull(),
    method: text("method").notNull(),
    reference: text("reference").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("registered"),
    /** Chave gerada pela tela de registro: um clique repetido nunca cria dois pagamentos. */
    idempotencyKey: text("idempotency_key").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    voidedBy: uuid("voided_by").references(() => users.id, { onDelete: "set null" }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason").notNull().default(""),
  },
  (t) => [
    uniqueIndex("partner_payouts_idempotency_unique").on(t.idempotencyKey),
    index("partner_payouts_partner_idx").on(t.partnerId, t.paidOn.desc()),
    check("partner_payouts_amount_positive", sql`${t.amountCents} > 0`),
    check("partner_payouts_status_check", sql`${t.status} in ('registered', 'voided')`),
  ],
);

/**
 * Lançamentos de comissão (o livro-razão do parceiro). Comissão e estorno nascem de um recebimento
 * (um lançamento por recebimento: índice único); ajuste é manual, com motivo. Valor com sinal.
 */
export const commissionEntries = pgTable(
  "commission_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    referralId: uuid("referral_id").references(() => referrals.id, { onDelete: "restrict" }),
    receiptId: uuid("receipt_id").references(() => revenueReceipts.id, { onDelete: "restrict" }),
    ruleId: uuid("rule_id").references(() => commissionRules.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    tierKey: text("tier_key"),
    baseCents: money("base_cents").notNull().default(0),
    rateBp: integer("rate_bp"),
    amountCents: money("amount_cents").notNull(),
    status: text("status").notNull().default("pending"),
    reason: text("reason").notNull().default(""),
    reversalOf: uuid("reversal_of").references((): AnyPgColumn => commissionEntries.id, { onDelete: "restrict" }),
    payoutId: uuid("payout_id").references(() => partnerPayouts.id, { onDelete: "restrict" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => users.id, { onDelete: "set null" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("commission_entries_receipt_unique").on(t.receiptId).where(sql`${t.receiptId} IS NOT NULL`),
    index("commission_entries_partner_idx").on(t.partnerId, t.status, t.createdAt.desc()),
    index("commission_entries_payout_idx").on(t.payoutId),
    index("commission_entries_referral_idx").on(t.referralId),
    check("commission_entries_kind_check", sql`${t.kind} in ('commission', 'reversal', 'adjustment')`),
    check("commission_entries_status_check", sql`${t.status} in ('pending', 'approved', 'paid', 'cancelled')`),
    check("commission_entries_amount_nonzero", sql`${t.amountCents} <> 0`),
    check("commission_entries_source_check", sql`${t.kind} = 'adjustment' OR ${t.receiptId} IS NOT NULL`),
    check("commission_entries_paid_has_payout", sql`(${t.status} = 'paid') = (${t.payoutId} IS NOT NULL)`),
    check("commission_entries_adjustment_reason", sql`${t.kind} <> 'adjustment' OR length(${t.reason}) > 0`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Contratos, arquivos e recursos                                              */
/* -------------------------------------------------------------------------- */

/** Arquivos privados do programa (contratos, materiais). Baixados só por rota autorizada. */
export const allianceFiles = pgTable("alliance_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  storageKey: text("storage_key").notNull().unique(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Contratos e termos: versão, vigência e aceite (com data, pessoa, IP e hash do texto aceito). */
export const partnerContracts = pgTable(
  "partner_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("partnership"),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("draft"),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    terms: text("terms").notNull().default(""),
    termsSha256: text("terms_sha256"),
    commercialTerms: text("commercial_terms").notNull().default(""),
    fileId: uuid("file_id").references(() => allianceFiles.id, { onDelete: "restrict" }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: uuid("accepted_by").references(() => partnerUsers.id, { onDelete: "set null" }),
    acceptedName: text("accepted_name"),
    acceptedIp: text("accepted_ip"),
    acceptedUserAgent: text("accepted_user_agent"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("partner_contracts_version_unique").on(t.partnerId, t.kind, t.version),
    index("partner_contracts_partner_idx").on(t.partnerId, t.createdAt.desc()),
    check("partner_contracts_status_check", sql`${t.status} in ('draft', 'sent', 'active', 'expired', 'terminated')`),
    check("partner_contracts_dates_check", sql`${t.endsOn} IS NULL OR ${t.startsOn} IS NULL OR ${t.endsOn} >= ${t.startsOn}`),
    check("partner_contracts_accepted_check", sql`${t.acceptedAt} IS NULL OR ${t.termsSha256} IS NOT NULL`),
  ],
);

/** Biblioteca do parceiro: materiais e treinamentos, segmentados por nível, modalidade e empresa. */
export const partnerResources = pgTable(
  "partner_resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull(),
    fileId: uuid("file_id").references(() => allianceFiles.id, { onDelete: "restrict" }),
    url: text("url"),
    status: text("status").notNull().default("draft"),
    minTierRank: smallint("min_tier_rank").notNull().default(1),
    modalities: text("modalities").array().notNull().default(sql`'{}'::text[]`),
    partnerIds: uuid("partner_ids").array().notNull().default(sql`'{}'::uuid[]`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("partner_resources_status_idx").on(t.status, t.category, t.sortOrder),
    check("partner_resources_status_check", sql`${t.status} in ('draft', 'published')`),
    check("partner_resources_source_check", sql`(${t.fileId} IS NOT NULL) <> (${t.url} IS NOT NULL)`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Comunicação, suporte e configurações                                        */
/* -------------------------------------------------------------------------- */

/** Comunicados do programa, segmentados. "Importante" também vai por e-mail. */
export const allianceAnnouncements = pgTable(
  "alliance_announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    important: boolean("important").notNull().default(false),
    status: text("status").notNull().default("draft"),
    minTierRank: smallint("min_tier_rank").notNull().default(1),
    modalities: text("modalities").array().notNull().default(sql`'{}'::text[]`),
    partnerIds: uuid("partner_ids").array().notNull().default(sql`'{}'::uuid[]`),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("alliance_announcements_status_idx").on(t.status, t.publishedAt.desc()),
    check("alliance_announcements_status_check", sql`${t.status} in ('draft', 'published', 'archived')`),
  ],
);

/** Avisos no Hub, por pessoa. */
export const partnerNotifications = pgTable(
  "partner_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    partnerUserId: uuid("partner_user_id")
      .notNull()
      .references(() => partnerUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("partner_notifications_user_idx").on(t.partnerUserId, t.createdAt.desc())],
);

/**
 * Registro de e-mails do programa. `dedupe_key` único: o mesmo evento nunca manda o mesmo e-mail duas
 * vezes (ex.: "application-received:<id>"). Guarda o estado de entrega e o erro, sem o corpo do e-mail.
 */
export const allianceEmailLog = pgTable(
  "alliance_email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dedupeKey: text("dedupe_key").notNull(),
    template: text("template").notNull(),
    toEmail: text("to_email").notNull(),
    partnerId: uuid("partner_id").references(() => partners.id, { onDelete: "set null" }),
    status: text("status").notNull().default("sending"),
    attempts: smallint("attempts").notNull().default(0),
    providerId: text("provider_id"),
    lastError: text("last_error"),
    /** Parâmetros para reenviar (nunca links com token). Nulo quando o e-mail não pode ser reenviado. */
    params: jsonb("params"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("alliance_email_log_dedupe_unique").on(t.dedupeKey),
    index("alliance_email_log_status_idx").on(t.status, t.createdAt.desc()),
    check("alliance_email_log_status_check", sql`${t.status} in ('sending', 'sent', 'failed', 'skipped')`),
  ],
);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().default(sql`'SUP-' || lpad(nextval('support_ticket_seq')::text, 5, '0')`),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => partnerUsers.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull().default("open"),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("support_tickets_code_unique").on(t.code),
    index("support_tickets_partner_idx").on(t.partnerId, t.lastMessageAt.desc()),
    index("support_tickets_status_idx").on(t.status, t.lastMessageAt.desc()),
    check("support_tickets_status_check", sql`${t.status} in ('open', 'answered', 'closed')`),
  ],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorType: text("author_type").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    authorPartnerUserId: uuid("author_partner_user_id").references(() => partnerUsers.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("support_messages_ticket_idx").on(t.ticketId, t.createdAt),
    check("support_messages_author_check", sql`${t.authorType} in ('partner', 'cms')`),
  ],
);

/** Parâmetros operacionais do programa (um registro, chave "program"). Validados por schema no servidor. */
export const allianceSettings = pgTable("alliance_settings", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  version: integer("version").notNull().default(1),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
