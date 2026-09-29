import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema, type Tx } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { can } from "@/server/authz/guard";
import type { SessionUser } from "@/server/auth/session";
import { CACHE_TAGS, invalidate } from "@/server/cache";
import { conflict, forbidden, HttpError, notFound } from "@/server/http/errors";
import { log } from "@/server/log";
import { isUuid, syncMediaUsages, type MediaRef } from "@/server/media/service";
import { documentStats, documentText, headingsOf, mediaIdsOf, type BlogDocument } from "@/lib/blog/document";
import type { BlogSnapshot } from "@/lib/blog/types";
import { availableActions, canEditContent, canTransition, TRANSITIONS, type BlogAction, type BlogStatus } from "@/lib/blog/workflow";
import { slugify } from "@/lib/validation/projects";
import { articleInputSchema, type ArticleInput, type AuthorInput, type CategoryInput, type OwnAuthorProfile } from "@/lib/validation/blog";

/**
 * Blog: artigos, fluxo editorial, revisões, comentários, autores e categorias.
 *
 * Regras de acesso, sempre verificadas aqui dentro da transação (as rotas só checam a permissão de entrada):
 * - `blog.edit_any` ou `blog.review`: vê todos os artigos.
 * - Só `blog.edit_own`: vê e edita apenas os próprios (criados por ele ou assinados pelo perfil dele).
 *   O artigo de outra pessoa responde 404, para não revelar que existe.
 * - Mudanças de estado seguem a tabela de src/lib/blog/workflow.ts.
 *
 * Como em Projetos, o site lê só `published_snapshot`. Editar um artigo no ar não muda o site até publicar de novo.
 */

type Ctx = { ip: string | null; userAgent: string | null };
type ArticleRow = typeof schema.blogArticles.$inferSelect;
type Runner = Tx | ReturnType<typeof getDb>;

const RESOURCE = "blog_article";
const NOT_FOUND = "Artigo não encontrado.";
/** Salvamentos seguidos da mesma pessoa em menos que isso atualizam a mesma revisão. */
const REVISION_WINDOW_MS = 2 * 60 * 1000;
const REVISIONS_KEPT = 50;
/** Mínimo de texto para publicar: evita publicar um rascunho vazio por engano. */
const MIN_WORDS_TO_PUBLISH = 150;

const actorOf = (user: SessionUser) => ({ id: user.id, email: user.email });

/* -------------------------------------------------------------------------- */
/* Acesso                                                                       */
/* -------------------------------------------------------------------------- */

export function seesAllArticles(user: SessionUser) {
  return can(user, "blog.edit_any") || can(user, "blog.review");
}

/** Filtro SQL dos artigos que a pessoa pode ver. */
function visibleTo(user: SessionUser): SQL | undefined {
  if (seesAllArticles(user)) return undefined;
  return or(
    eq(schema.blogArticles.createdBy, user.id),
    inArray(schema.blogArticles.authorId, getDb().select({ id: schema.blogAuthors.id }).from(schema.blogAuthors).where(eq(schema.blogAuthors.userId, user.id))),
  );
}

async function authorUserId(runner: Runner, authorId: string | null) {
  if (!authorId) return null;
  const [row] = await runner.select({ userId: schema.blogAuthors.userId }).from(schema.blogAuthors).where(eq(schema.blogAuthors.id, authorId));
  return row?.userId ?? null;
}

function whoFor(user: SessionUser, isOwner: boolean) {
  return { can: (p: Parameters<typeof can>[1]) => can(user, p), isOwner };
}

/** Carrega o artigo (com trava, dentro de transação) e aplica a regra de visibilidade. */
async function loadArticle(runner: Runner, user: SessionUser, id: string, lock = false) {
  if (!isUuid(id)) throw notFound(NOT_FOUND);
  const query = runner.select().from(schema.blogArticles).where(eq(schema.blogArticles.id, id));
  const [row] = lock ? await query.for("update") : await query;
  if (!row) throw notFound(NOT_FOUND);
  const isOwner = row.createdBy === user.id || (await authorUserId(runner, row.authorId)) === user.id;
  if (!isOwner && !seesAllArticles(user)) throw notFound(NOT_FOUND);
  return { row, isOwner, who: whoFor(user, isOwner) };
}

function assertVersion(row: ArticleRow, expected: number) {
  if (row.version !== expected) {
    throw conflict("Este artigo foi alterado por outra pessoa desde que você abriu. Recarregue para ver a versão atual.", "stale");
  }
}

/* -------------------------------------------------------------------------- */
/* Conversões                                                                   */
/* -------------------------------------------------------------------------- */

export function toInput(row: ArticleRow): ArticleInput {
  return {
    title: row.title,
    slug: row.slug,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    content: row.content as BlogDocument,
    categoryId: row.categoryId,
    authorId: row.authorId,
    coverMediaId: row.coverMediaId,
    coverAlt: row.coverAlt,
    coverCaption: row.coverCaption,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    featured: row.featured,
  };
}

function columnsFrom(input: ArticleInput) {
  return {
    title: input.title,
    slug: input.slug,
    subtitle: input.subtitle,
    excerpt: input.excerpt,
    content: input.content,
    categoryId: input.categoryId,
    authorId: input.authorId,
    coverMediaId: input.coverMediaId,
    coverAlt: input.coverAlt,
    coverCaption: input.coverCaption,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    featured: input.featured,
    readingMinutes: documentStats(input.content).minutes,
  };
}

function mediaRefs(input: Pick<ArticleInput, "title" | "coverMediaId" | "content">, state: string, prefix: string): MediaRef[] {
  const refs: MediaRef[] = [];
  if (input.coverMediaId) refs.push({ mediaId: input.coverMediaId, field: `${prefix}:cover`, label: `Artigo ${input.title} · Capa (${state})` });
  mediaIdsOf(input.content).forEach((mediaId, i) => refs.push({ mediaId, field: `${prefix}:body.${i}`, label: `Artigo ${input.title} · Imagem ${i + 1} (${state})` }));
  return refs;
}

async function syncUsages(tx: Tx, id: string, input: ArticleInput, snapshot: BlogSnapshot | null) {
  await syncMediaUsages(tx, RESOURCE, id, [...mediaRefs(input, "rascunho", "draft"), ...(snapshot ? mediaRefs(snapshot, "publicado", "published") : [])]);
}

/**
 * Quem não tem acesso à biblioteca de mídia (o Colunista) só usa imagens que ele mesmo enviou,
 * ou as que já estavam no artigo (uma capa escolhida pelo editor, por exemplo).
 */
async function assertMediaAllowed(tx: Tx, user: SessionUser, ids: (string | null)[], resource?: { type: string; id: string }) {
  const wanted = [...new Set(ids.filter(isUuid))];
  if (wanted.length === 0 || can(user, "media.view")) return;
  const rows = await tx.select({ id: schema.media.id, uploadedBy: schema.media.uploadedBy }).from(schema.media).where(inArray(schema.media.id, wanted));
  const already = resource
    ? new Set(
        (
          await tx
            .select({ id: schema.mediaUsages.mediaId })
            .from(schema.mediaUsages)
            .where(and(eq(schema.mediaUsages.resourceType, resource.type), eq(schema.mediaUsages.resourceId, resource.id)))
        ).map((r) => r.id),
      )
    : new Set<string>();
  for (const row of rows) {
    if (row.uploadedBy !== user.id && !already.has(row.id)) throw forbidden("Use imagens enviadas por você.");
  }
}

/** Violações de unicidade e de chave estrangeira viram respostas claras em vez de 500. */
function translateDbError(error: unknown): never {
  const code = (error as { code?: string }).code;
  const constraint = (error as { constraint?: string }).constraint ?? "";
  if (code === "23505" && constraint.includes("slug")) throw slugTaken();
  if (code === "23503" && constraint.includes("media")) throw new HttpError(422, "media_missing", "Uma das imagens escolhidas foi removida da biblioteca. Escolha outra.");
  if (code === "23503" && constraint.includes("category")) throw new HttpError(422, "category_missing", "A categoria escolhida não existe mais.", { fields: { categoryId: "Escolha outra categoria." } });
  if (code === "23503" && constraint.includes("author")) throw new HttpError(422, "author_missing", "O autor escolhido não existe mais.", { fields: { authorId: "Escolha outro autor." } });
  throw error;
}

const slugTaken = () => new HttpError(409, "slug_taken", "Já existe um artigo com este endereço.", { fields: { slug: "Este endereço já está em uso. Escolha outro." } });

async function assertSlugAvailable(tx: Tx, slug: string, exceptId?: string) {
  const [taken] = await tx
    .select({ id: schema.blogArticles.id })
    .from(schema.blogArticles)
    .where(
      and(
        or(eq(schema.blogArticles.slug, slug), and(eq(schema.blogArticles.status, "published"), sql`${schema.blogArticles.publishedSnapshot} ->> 'slug' = ${slug}`)),
        exceptId ? ne(schema.blogArticles.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  if (taken) throw slugTaken();
}

async function assertRefsExist(tx: Tx, input: ArticleInput) {
  if (input.categoryId) {
    const [c] = await tx.select({ id: schema.blogCategories.id }).from(schema.blogCategories).where(eq(schema.blogCategories.id, input.categoryId));
    if (!c) throw new HttpError(422, "category_missing", "A categoria escolhida não existe mais.", { fields: { categoryId: "Escolha outra categoria." } });
  }
  if (input.authorId) {
    const [a] = await tx.select({ id: schema.blogAuthors.id }).from(schema.blogAuthors).where(eq(schema.blogAuthors.id, input.authorId));
    if (!a) throw new HttpError(422, "author_missing", "O autor escolhido não existe mais.", { fields: { authorId: "Escolha outro autor." } });
  }
}

/* -------------------------------------------------------------------------- */
/* Perfil de autor da pessoa logada                                             */
/* -------------------------------------------------------------------------- */

async function uniqueAuthorSlug(tx: Tx, name: string) {
  const base = slugify(name).slice(0, 80) || "autor";
  const existing = await tx.select({ slug: schema.blogAuthors.slug }).from(schema.blogAuthors).where(sql`${schema.blogAuthors.slug} = ${base} OR ${schema.blogAuthors.slug} LIKE ${`${base}-%`}`);
  const taken = new Set(existing.map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/**
 * Perfil de autor ligado à conta. Criado no primeiro artigo: o Colunista aparece como "Colunista convidado",
 * nunca como funcionário. Quem é da equipe aparece como equipe.
 */
async function ensureOwnAuthor(tx: Tx, user: SessionUser) {
  const [existing] = await tx.select({ id: schema.blogAuthors.id }).from(schema.blogAuthors).where(eq(schema.blogAuthors.userId, user.id));
  if (existing) return existing.id;
  const [row] = await tx
    .insert(schema.blogAuthors)
    .values({ userId: user.id, name: user.name, slug: await uniqueAuthorSlug(tx, user.name), affiliation: user.roleKey === "columnist" ? "guest" : "team", isActive: true })
    .returning({ id: schema.blogAuthors.id });
  return row.id;
}

export async function getOwnAuthor(user: SessionUser) {
  const [row] = await getDb().select().from(schema.blogAuthors).where(eq(schema.blogAuthors.userId, user.id));
  return row ?? null;
}

export async function updateOwnAuthor(user: SessionUser, input: OwnAuthorProfile, expectedVersion: number | null, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const id = await ensureOwnAuthor(tx, user);
    const [current] = await tx.select().from(schema.blogAuthors).where(eq(schema.blogAuthors.id, id)).for("update");
    // Sem versão: o perfil acabou de ser criado nesta mesma gravação.
    if (expectedVersion !== null && current.version !== expectedVersion) {
      throw conflict("Seu perfil foi alterado em outra aba. Recarregue para ver a versão atual.", "stale");
    }
    await assertMediaAllowed(tx, user, [input.photoMediaId], { type: "blog_author", id });
    const [row] = await tx
      .update(schema.blogAuthors)
      .set({ ...input, updatedAt: new Date(), version: sql`${schema.blogAuthors.version} + 1` })
      .where(eq(schema.blogAuthors.id, id))
      .returning();
    await syncAuthorUsages(tx, row);
    const changes = diff({ name: current.name, roleTitle: current.roleTitle, bio: current.bio, photoMediaId: current.photoMediaId, links: current.links }, input);
    if (Object.keys(changes).length) await audit({ actor: actorOf(user), action: "blog.author_profile_updated", resourceType: "blog_author", resourceId: id, summary: "Atualizou o próprio perfil de autor", changes, ...ctx }, tx);
    invalidate(CACHE_TAGS.blog);
    return row;
  });
}

async function syncAuthorUsages(tx: Tx, row: typeof schema.blogAuthors.$inferSelect) {
  await syncMediaUsages(tx, "blog_author", row.id, row.photoMediaId ? [{ mediaId: row.photoMediaId, field: "photo", label: `Autor ${row.name} · Foto` }] : []);
}

/* -------------------------------------------------------------------------- */
/* Leitura para o Studio                                                        */
/* -------------------------------------------------------------------------- */

export type ArticleListQuery = { q?: string; status?: BlogStatus; categoria?: string; autor?: string; aba?: "meus" | "revisao" | "todos" };

export async function listArticles(user: SessionUser, input: ArticleListQuery) {
  const where: (SQL | undefined)[] = [visibleTo(user)];
  if (input.aba === "meus") {
    where.push(
      or(
        eq(schema.blogArticles.createdBy, user.id),
        inArray(schema.blogArticles.authorId, getDb().select({ id: schema.blogAuthors.id }).from(schema.blogAuthors).where(eq(schema.blogAuthors.userId, user.id))),
      ),
    );
  }
  if (input.aba === "revisao") where.push(eq(schema.blogArticles.status, "in_review"));
  if (input.status) where.push(eq(schema.blogArticles.status, input.status));
  if (input.categoria) where.push(eq(schema.blogArticles.categoryId, input.categoria));
  if (input.autor) where.push(eq(schema.blogArticles.authorId, input.autor));
  const q = input.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(schema.blogArticles.title, pattern), ilike(schema.blogArticles.slug, pattern), ilike(schema.blogArticles.excerpt, pattern)));
  }
  const frozenAt = sql`(${schema.blogArticles.publishedSnapshot} ->> 'frozenAt')::timestamptz`;
  return getDb()
    .select({
      id: schema.blogArticles.id,
      slug: schema.blogArticles.slug,
      title: schema.blogArticles.title,
      status: schema.blogArticles.status,
      featured: schema.blogArticles.featured,
      readingMinutes: schema.blogArticles.readingMinutes,
      scheduledAt: schema.blogArticles.scheduledAt,
      publishedAt: schema.blogArticles.publishedAt,
      updatedAt: schema.blogArticles.updatedAt,
      createdBy: schema.blogArticles.createdBy,
      version: schema.blogArticles.version,
      hasChanges: sql<boolean>`(${schema.blogArticles.status} = 'published' AND ${schema.blogArticles.updatedAt} > ${frozenAt})`,
      categoryName: schema.blogCategories.name,
      authorName: schema.blogAuthors.name,
      authorUserId: schema.blogAuthors.userId,
      coverUrl: schema.media.url,
      coverBlur: schema.media.blurDataUrl,
    })
    .from(schema.blogArticles)
    .leftJoin(schema.blogCategories, eq(schema.blogCategories.id, schema.blogArticles.categoryId))
    .leftJoin(schema.blogAuthors, eq(schema.blogAuthors.id, schema.blogArticles.authorId))
    .leftJoin(schema.media, eq(schema.media.id, schema.blogArticles.coverMediaId))
    .where(and(...where))
    .orderBy(desc(schema.blogArticles.updatedAt))
    .limit(300);
}

export async function countArticlesByStatus(user: SessionUser) {
  const rows = await getDb()
    .select({ status: schema.blogArticles.status, total: sql<number>`count(*)::int` })
    .from(schema.blogArticles)
    .where(visibleTo(user))
    .groupBy(schema.blogArticles.status);
  const counts: Record<BlogStatus, number> = { draft: 0, in_review: 0, approved: 0, scheduled: 0, published: 0, archived: 0 };
  for (const r of rows) counts[r.status] = r.total;
  return counts;
}

/** Tudo que a tela do editor precisa. Nulo quando o artigo não existe ou a pessoa não pode vê-lo. */
export async function getArticleForEditor(user: SessionUser, id: string) {
  const db = getDb();
  let loaded: Awaited<ReturnType<typeof loadArticle>>;
  try {
    loaded = await loadArticle(db, user, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
  const { row, isOwner, who } = loaded;
  const [comments, revisions] = await Promise.all([listComments(row.id), listRevisions(row.id)]);
  const snapshot = row.publishedSnapshot as BlogSnapshot | null;
  const nameOf = async (userId: string | null) =>
    userId ? ((await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { name: true } }))?.name ?? null) : null;
  return {
    row,
    input: toInput(row),
    isOwner,
    canEdit: canEditContent(row.status, who),
    actions: availableActions(row.status, who),
    hasChanges: row.status === "published" && snapshot !== null && row.updatedAt.getTime() > new Date(snapshot.frozenAt).getTime(),
    publishedSlug: snapshot?.slug ?? null,
    comments,
    revisions,
    updatedByName: await nameOf(row.updatedBy),
    createdByName: await nameOf(row.createdBy),
  };
}

/** Artigo em edição para a pré-visualização (mesma regra de acesso do editor). */
export async function getArticleForPreview(user: SessionUser, id: string) {
  const { row } = await loadArticle(getDb(), user, id);
  return row;
}

/* -------------------------------------------------------------------------- */
/* Revisões                                                                     */
/* -------------------------------------------------------------------------- */

export const REVISION_REASONS: Record<string, string> = {
  create: "Criação",
  save: "Salvamento",
  submit: "Envio para revisão",
  request_changes: "Devolvido com comentários",
  approve: "Aprovação",
  publish: "Publicação",
  schedule: "Agendamento",
  restore: "Restauração",
};

async function listRevisions(articleId: string) {
  return getDb()
    .select({ id: schema.blogRevisions.id, number: schema.blogRevisions.number, reason: schema.blogRevisions.reason, createdAt: schema.blogRevisions.createdAt, authorName: schema.users.name })
    .from(schema.blogRevisions)
    .leftJoin(schema.users, eq(schema.users.id, schema.blogRevisions.createdBy))
    .where(eq(schema.blogRevisions.articleId, articleId))
    .orderBy(desc(schema.blogRevisions.number))
    .limit(REVISIONS_KEPT);
}

async function addRevision(tx: Tx, articleId: string, userId: string | null, reason: keyof typeof REVISION_REASONS, input: ArticleInput) {
  const [last] = await tx
    .select()
    .from(schema.blogRevisions)
    .where(eq(schema.blogRevisions.articleId, articleId))
    .orderBy(desc(schema.blogRevisions.number))
    .limit(1);
  // Vários salvamentos seguidos da mesma pessoa viram uma revisão só (a mais recente).
  if (reason === "save" && last && last.reason === "save" && last.createdBy === userId && Date.now() - last.createdAt.getTime() < REVISION_WINDOW_MS) {
    await tx.update(schema.blogRevisions).set({ snapshot: input }).where(eq(schema.blogRevisions.id, last.id));
    return;
  }
  const number = (last?.number ?? 0) + 1;
  await tx.insert(schema.blogRevisions).values({ articleId, number, reason, snapshot: input, createdBy: userId });
  if (number > REVISIONS_KEPT) {
    await tx.delete(schema.blogRevisions).where(and(eq(schema.blogRevisions.articleId, articleId), lte(schema.blogRevisions.number, number - REVISIONS_KEPT)));
  }
}

export async function getRevision(user: SessionUser, articleId: string, revisionId: string) {
  const { row } = await loadArticle(getDb(), user, articleId);
  if (!isUuid(revisionId)) throw notFound("Revisão não encontrada.");
  const [rev] = await getDb()
    .select()
    .from(schema.blogRevisions)
    .where(and(eq(schema.blogRevisions.id, revisionId), eq(schema.blogRevisions.articleId, row.id)));
  if (!rev) throw notFound("Revisão não encontrada.");
  return rev;
}

/** Restaurar copia a revisão para a cópia de trabalho, como uma revisão nova. O histórico não é apagado. */
export async function restoreRevision(user: SessionUser, articleId: string, revisionId: string, expectedVersion: number, ctx: Ctx) {
  try {
    return await getDb().transaction(async (tx) => {
      const { row, who } = await loadArticle(tx, user, articleId, true);
      assertVersion(row, expectedVersion);
      if (!canEditContent(row.status, who)) throw forbidden("Este artigo não pode ser editado agora.");
      if (!isUuid(revisionId)) throw notFound("Revisão não encontrada.");
      const [rev] = await tx
        .select()
        .from(schema.blogRevisions)
        .where(and(eq(schema.blogRevisions.id, revisionId), eq(schema.blogRevisions.articleId, row.id)));
      if (!rev) throw notFound("Revisão não encontrada.");

      const parsed = articleInputSchema.safeParse(rev.snapshot);
      if (!parsed.success) throw new HttpError(422, "revision_invalid", "Esta revisão não pode ser restaurada.");
      const current = toInput(row);
      // Autoria e destaque não voltam com a revisão: continuam sob as regras de quem pode alterá-los.
      const input: ArticleInput = { ...parsed.data, authorId: current.authorId, featured: current.featured };
      await assertRefsExist(tx, input);
      if (input.slug !== row.slug) await assertSlugAvailable(tx, input.slug, row.id);

      const [updated] = await tx
        .update(schema.blogArticles)
        .set({ ...columnsFrom(input), updatedBy: user.id, updatedAt: new Date(), version: sql`${schema.blogArticles.version} + 1` })
        .where(eq(schema.blogArticles.id, row.id))
        .returning({ version: schema.blogArticles.version });
      await syncUsages(tx, row.id, input, row.publishedSnapshot as BlogSnapshot | null);
      await addRevision(tx, row.id, user.id, "restore", input);
      await audit(
        { actor: actorOf(user), action: "blog.revision_restored", resourceType: RESOURCE, resourceId: row.id, summary: `Restaurou a revisão ${rev.number} do artigo ${input.title}`, changes: diff(current, input), ...ctx },
        tx,
      );
      return { version: updated.version };
    });
  } catch (error) {
    translateDbError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Comentários editoriais                                                       */
/* -------------------------------------------------------------------------- */

async function listComments(articleId: string) {
  return getDb()
    .select({
      id: schema.blogComments.id,
      kind: schema.blogComments.kind,
      body: schema.blogComments.body,
      createdAt: schema.blogComments.createdAt,
      resolvedAt: schema.blogComments.resolvedAt,
      authorName: schema.users.name,
      authorUserId: schema.blogComments.authorUserId,
    })
    .from(schema.blogComments)
    .leftJoin(schema.users, eq(schema.users.id, schema.blogComments.authorUserId))
    .where(eq(schema.blogComments.articleId, articleId))
    .orderBy(asc(schema.blogComments.createdAt));
}

/** Comentam: quem revisa e o próprio autor (para responder à revisão). */
export async function addComment(user: SessionUser, articleId: string, body: string, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const { row, isOwner } = await loadArticle(tx, user, articleId);
    if (!isOwner && !can(user, "blog.review")) throw forbidden();
    const [comment] = await tx.insert(schema.blogComments).values({ articleId: row.id, authorUserId: user.id, kind: "comment", body }).returning({ id: schema.blogComments.id });
    await audit({ actor: actorOf(user), action: "blog.commented", resourceType: RESOURCE, resourceId: row.id, summary: `Comentou no artigo ${row.title}`, ...ctx }, tx);
    return comment;
  });
}

export async function resolveComment(user: SessionUser, articleId: string, commentId: string, resolved: boolean) {
  return getDb().transaction(async (tx) => {
    const { row, isOwner } = await loadArticle(tx, user, articleId);
    if (!isOwner && !can(user, "blog.review")) throw forbidden();
    if (!isUuid(commentId)) throw notFound("Comentário não encontrado.");
    const [updated] = await tx
      .update(schema.blogComments)
      .set(resolved ? { resolvedAt: new Date(), resolvedBy: user.id } : { resolvedAt: null, resolvedBy: null })
      .where(and(eq(schema.blogComments.id, commentId), eq(schema.blogComments.articleId, row.id)))
      .returning({ id: schema.blogComments.id });
    if (!updated) throw notFound("Comentário não encontrado.");
  });
}

/* -------------------------------------------------------------------------- */
/* Escrita                                                                      */
/* -------------------------------------------------------------------------- */

/** Autoria: quem não edita artigos de outros só assina como ele mesmo. */
async function resolveAuthor(tx: Tx, user: SessionUser, requested: string | null, current: string | null) {
  if (can(user, "blog.edit_any")) return requested ?? current ?? (await ensureOwnAuthor(tx, user));
  const own = await ensureOwnAuthor(tx, user);
  const allowed = new Set([own, current].filter(Boolean));
  if (requested && !allowed.has(requested)) throw forbidden("Você só pode assinar artigos como você.");
  return current ?? own;
}

export async function createArticle(user: SessionUser, input: ArticleInput, ctx: Ctx) {
  try {
    return await getDb().transaction(async (tx) => {
      await assertSlugAvailable(tx, input.slug);
      const data: ArticleInput = {
        ...input,
        authorId: await resolveAuthor(tx, user, input.authorId, null),
        featured: can(user, "blog.publish") ? input.featured : false,
      };
      await assertRefsExist(tx, data);
      await assertMediaAllowed(tx, user, [data.coverMediaId, ...mediaIdsOf(data.content)]);
      const [row] = await tx
        .insert(schema.blogArticles)
        .values({ ...columnsFrom(data), status: "draft", createdBy: user.id, updatedBy: user.id })
        .returning({ id: schema.blogArticles.id, version: schema.blogArticles.version });
      await syncUsages(tx, row.id, data, null);
      await addRevision(tx, row.id, user.id, "create", data);
      await audit({ actor: actorOf(user), action: "blog.created", resourceType: RESOURCE, resourceId: row.id, summary: `Criou o artigo ${data.title}`, ...ctx }, tx);
      return row;
    });
  } catch (error) {
    translateDbError(error);
  }
}

export async function updateArticle(user: SessionUser, id: string, input: ArticleInput, expectedVersion: number, ctx: Ctx) {
  let featuredChanged = false;
  try {
    const result = await getDb().transaction(async (tx) => {
      const { row, who } = await loadArticle(tx, user, id, true);
      assertVersion(row, expectedVersion);
      if (!canEditContent(row.status, who)) {
        throw forbidden(row.status === "archived" ? "Restaure o artigo antes de editar." : "Este artigo já foi aprovado. Peça a um editor para devolvê-lo antes de editar.");
      }
      const before = toInput(row);
      const data: ArticleInput = {
        ...input,
        authorId: await resolveAuthor(tx, user, input.authorId, row.authorId),
        featured: can(user, "blog.publish") ? input.featured : row.featured,
      };
      if (data.slug !== row.slug) await assertSlugAvailable(tx, data.slug, row.id);
      await assertRefsExist(tx, data);
      await assertMediaAllowed(tx, user, [data.coverMediaId, ...mediaIdsOf(data.content)], { type: RESOURCE, id: row.id });

      const changes = diff({ ...before, content: undefined }, { ...data, content: undefined });
      const contentChanged = JSON.stringify(before.content) !== JSON.stringify(data.content);
      if (contentChanged) changes.content = { before: "(texto anterior)", after: "(texto alterado)" };

      const [updated] = await tx
        .update(schema.blogArticles)
        .set({ ...columnsFrom(data), updatedBy: user.id, updatedAt: new Date(), version: sql`${schema.blogArticles.version} + 1` })
        .where(eq(schema.blogArticles.id, row.id))
        .returning({ version: schema.blogArticles.version, readingMinutes: schema.blogArticles.readingMinutes });
      await syncUsages(tx, row.id, data, row.publishedSnapshot as BlogSnapshot | null);
      if (Object.keys(changes).length) {
        await addRevision(tx, row.id, user.id, "save", data);
        await audit({ actor: actorOf(user), action: "blog.updated", resourceType: RESOURCE, resourceId: row.id, summary: `Editou o artigo ${data.title}`, changes, ...ctx }, tx);
      }
      featuredChanged = row.status === "published" && before.featured !== data.featured;
      return updated;
    });
    if (featuredChanged) invalidate(CACHE_TAGS.blog);
    return result;
  } catch (error) {
    translateDbError(error);
  }
}

/** O mínimo para um artigo público completo. */
function assertPublishable(input: ArticleInput) {
  const fields: Record<string, string> = {};
  if (!input.categoryId) fields.categoryId = "Escolha uma categoria para publicar.";
  if (!input.authorId) fields.authorId = "Escolha o autor para publicar.";
  if (!input.coverMediaId) fields.coverMediaId = "Escolha uma capa para publicar.";
  else if (!input.coverAlt) fields.coverAlt = "Descreva a capa no texto alternativo.";
  if (input.excerpt.length < 40) fields.excerpt = "Escreva um resumo de pelo menos 40 caracteres.";
  if (documentStats(input.content).words < MIN_WORDS_TO_PUBLISH) fields.content = `O texto precisa de pelo menos ${MIN_WORDS_TO_PUBLISH} palavras para ser publicado.`;
  if (Object.keys(fields).length) throw new HttpError(422, "not_publishable", "Faltam ajustes para publicar.", { fields });
}

function buildSnapshot(input: ArticleInput, now: Date, previous: BlogSnapshot | null): BlogSnapshot {
  const stats = documentStats(input.content);
  return {
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    excerpt: input.excerpt,
    content: input.content,
    toc: headingsOf(input.content),
    categoryId: input.categoryId!,
    authorId: input.authorId!,
    coverMediaId: input.coverMediaId!,
    coverAlt: input.coverAlt,
    coverCaption: input.coverCaption,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    readingMinutes: stats.minutes,
    words: stats.words,
    frozenAt: now.toISOString(),
    revisedAt: previous ? now.toISOString() : null,
  };
}

async function assertAuthorActive(tx: Tx, authorId: string) {
  const [a] = await tx.select({ isActive: schema.blogAuthors.isActive }).from(schema.blogAuthors).where(eq(schema.blogAuthors.id, authorId));
  if (!a?.isActive) throw new HttpError(422, "author_inactive", "O autor deste artigo está desativado.", { fields: { authorId: "Escolha um autor ativo." } });
}

/** Congela a cópia de trabalho e põe no ar. Usado por "Publicar" e pela publicação agendada. */
async function publishRow(tx: Tx, row: ArticleRow, actorId: string | null) {
  const input = toInput(row);
  assertPublishable(input);
  await assertAuthorActive(tx, input.authorId!);
  await assertSlugAvailable(tx, input.slug, row.id);
  const previous = row.status === "published" ? (row.publishedSnapshot as BlogSnapshot | null) : null;
  const now = new Date();
  const snapshot = buildSnapshot(input, now, previous);
  const text = documentText(input.content);
  const [updated] = await tx
    .update(schema.blogArticles)
    .set({
      status: "published",
      publishedSnapshot: snapshot,
      publishedAt: row.firstPublishedAt ?? now,
      firstPublishedAt: row.firstPublishedAt ?? now,
      publishedBy: actorId,
      scheduledAt: null,
      readingMinutes: snapshot.readingMinutes,
      searchVector: sql`setweight(to_tsvector('portuguese', unaccent(${input.title})), 'A') || setweight(to_tsvector('portuguese', unaccent(${`${input.subtitle} ${input.excerpt}`})), 'B') || setweight(to_tsvector('portuguese', unaccent(${text})), 'C')`,
      updatedAt: now,
      version: sql`${schema.blogArticles.version} + 1`,
    })
    .where(eq(schema.blogArticles.id, row.id))
    .returning({ version: schema.blogArticles.version });
  await syncUsages(tx, row.id, input, snapshot);
  await addRevision(tx, row.id, actorId, "publish", input);
  return { version: updated.version, snapshot, previous };
}

/** Tags afetadas quando o que está no ar muda. */
function blogTags(...slugs: (string | null | undefined)[]) {
  return [CACHE_TAGS.blog, ...[...new Set(slugs.filter(Boolean) as string[])].map(CACHE_TAGS.blogArticle)];
}

export async function transitionArticle(
  user: SessionUser,
  id: string,
  action: BlogAction,
  options: { version: number; comment?: string; scheduledAt?: string },
  ctx: Ctx,
) {
  let tags: string[] = [];
  try {
    const result = await getDb().transaction(async (tx) => {
      const { row, who } = await loadArticle(tx, user, id, true);
      assertVersion(row, options.version);
      if (!canTransition(action, row.status, who)) {
        // Sem a permissão da ação: 403. Com a permissão, mas no estado errado: 409.
        const rule = TRANSITIONS[action];
        const allowedByRole = who.can(rule.permission) || (rule.owner && who.isOwner && who.can("blog.edit_own"));
        if (!allowedByRole) throw forbidden();
        throw conflict("Esta ação não vale para o estado atual do artigo. Recarregue a página.", "invalid_transition");
      }
      const actor = actorOf(user);
      const input = toInput(row);
      const oldSlug = (row.publishedSnapshot as BlogSnapshot | null)?.slug;
      const bump = { version: sql`${schema.blogArticles.version} + 1` };
      let version: number;
      let summary: string;

      switch (action) {
        case "submit": {
          if (documentStats(input.content).words < 30) throw new HttpError(422, "too_short", "Escreva o texto antes de enviar para revisão.", { fields: { content: "O texto está vazio ou curto demais." } });
          [{ version }] = await tx.update(schema.blogArticles).set({ status: "in_review", submittedAt: new Date(), ...bump }).where(eq(schema.blogArticles.id, row.id)).returning({ version: schema.blogArticles.version });
          await addRevision(tx, row.id, user.id, "submit", input);
          summary = `Enviou o artigo ${row.title} para revisão`;
          break;
        }
        case "request_changes": {
          const comment = options.comment?.trim();
          if (!comment) throw new HttpError(422, "comment_required", "Explique o que precisa mudar.", { fields: { comment: "Escreva o que o autor precisa ajustar." } });
          [{ version }] = await tx.update(schema.blogArticles).set({ status: "draft", approvedAt: null, approvedBy: null, ...bump }).where(eq(schema.blogArticles.id, row.id)).returning({ version: schema.blogArticles.version });
          await tx.insert(schema.blogComments).values({ articleId: row.id, authorUserId: user.id, kind: "changes_requested", body: comment });
          await addRevision(tx, row.id, user.id, "request_changes", input);
          summary = `Devolveu o artigo ${row.title} com comentários`;
          break;
        }
        case "approve": {
          [{ version }] = await tx.update(schema.blogArticles).set({ status: "approved", approvedAt: new Date(), approvedBy: user.id, ...bump }).where(eq(schema.blogArticles.id, row.id)).returning({ version: schema.blogArticles.version });
          await addRevision(tx, row.id, user.id, "approve", input);
          summary = `Aprovou o artigo ${row.title}`;
          break;
        }
        case "publish": {
          const published = await publishRow(tx, row, user.id);
          version = published.version;
          tags = blogTags(oldSlug, published.snapshot.slug);
          summary = published.previous ? `Publicou alterações do artigo ${row.title}` : `Publicou o artigo ${row.title}`;
          break;
        }
        case "schedule": {
          const when = options.scheduledAt ? new Date(options.scheduledAt) : null;
          if (!when || Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) {
            throw new HttpError(422, "invalid_schedule", "Escolha uma data e hora futuras.", { fields: { scheduledAt: "Escolha uma data e hora pelo menos 1 minuto à frente." } });
          }
          if (when.getTime() > Date.now() + 366 * 24 * 3600 * 1000) throw new HttpError(422, "invalid_schedule", "Agende para no máximo um ano à frente.", { fields: { scheduledAt: "Data distante demais." } });
          assertPublishable(input);
          [{ version }] = await tx.update(schema.blogArticles).set({ status: "scheduled", scheduledAt: when, ...bump }).where(eq(schema.blogArticles.id, row.id)).returning({ version: schema.blogArticles.version });
          await addRevision(tx, row.id, user.id, "schedule", input);
          summary = `Agendou o artigo ${row.title} para ${when.toISOString()}`;
          break;
        }
        case "unschedule": {
          [{ version }] = await tx.update(schema.blogArticles).set({ status: "approved", scheduledAt: null, ...bump }).where(eq(schema.blogArticles.id, row.id)).returning({ version: schema.blogArticles.version });
          summary = `Cancelou o agendamento do artigo ${row.title}`;
          break;
        }
        case "unpublish":
        case "archive": {
          const target = action === "unpublish" ? "approved" : "archived";
          [{ version }] = await tx
            .update(schema.blogArticles)
            .set({ status: target, publishedSnapshot: null, searchVector: null, scheduledAt: null, ...bump })
            .where(eq(schema.blogArticles.id, row.id))
            .returning({ version: schema.blogArticles.version });
          await syncUsages(tx, row.id, input, null);
          if (row.status === "published") tags = blogTags(oldSlug);
          summary = action === "unpublish" ? `Despublicou o artigo ${row.title}` : `Arquivou o artigo ${row.title}`;
          break;
        }
        case "restore": {
          [{ version }] = await tx.update(schema.blogArticles).set({ status: "draft", ...bump }).where(eq(schema.blogArticles.id, row.id)).returning({ version: schema.blogArticles.version });
          summary = `Restaurou o artigo ${row.title} como rascunho`;
          break;
        }
      }
      const to = TRANSITIONS[action].to;
      await audit(
        { actor, action: `blog.${action}`, resourceType: RESOURCE, resourceId: row.id, summary, changes: row.status !== to ? { status: { before: row.status, after: to } } : null, ...ctx },
        tx,
      );
      return { version, status: to };
    });
    if (tags.length) invalidate(...tags);
    return result;
  } catch (error) {
    translateDbError(error);
  }
}

/** Exclusão definitiva: só de rascunhos e arquivados, com o endereço digitado como confirmação. */
export async function deleteArticle(user: SessionUser, id: string, expectedVersion: number, confirmSlug: string, ctx: Ctx) {
  await getDb().transaction(async (tx) => {
    const { row } = await loadArticle(tx, user, id, true);
    assertVersion(row, expectedVersion);
    if (row.status !== "archived" && row.status !== "draft") throw conflict("Arquive o artigo antes de excluir.", "not_archived");
    if (confirmSlug.trim() !== row.slug) {
      throw new HttpError(422, "confirmation_mismatch", "Digite o endereço do artigo para confirmar.", { fields: { confirmSlug: "O endereço não confere." } });
    }
    await syncMediaUsages(tx, RESOURCE, row.id, []);
    await tx.delete(schema.blogArticles).where(eq(schema.blogArticles.id, row.id));
    await audit(
      { actor: actorOf(user), action: "blog.deleted", resourceType: RESOURCE, resourceId: row.id, summary: `Excluiu definitivamente o artigo ${row.title}`, changes: { title: { before: row.title, after: null }, slug: { before: row.slug, after: null } }, ...ctx },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Publicação agendada                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Publica os artigos agendados que já venceram. Idempotente e seguro com execuções simultâneas
 * (cron e leituras do site ao mesmo tempo): cada artigo é travado com SKIP LOCKED e o estado é conferido de novo.
 *
 * Se um artigo não puder mais ser publicado (capa removida, autor desativado), ele volta a "Aprovado"
 * com um comentário explicando, em vez de ficar tentando para sempre.
 */
export async function publishDueArticles(now = new Date()) {
  const db = getDb();
  const due = await db
    .select({ id: schema.blogArticles.id })
    .from(schema.blogArticles)
    .where(and(eq(schema.blogArticles.status, "scheduled"), lte(schema.blogArticles.scheduledAt, now)))
    .orderBy(asc(schema.blogArticles.scheduledAt))
    .limit(25);
  const published: string[] = [];
  const failed: string[] = [];
  for (const { id } of due) {
    let tags: string[] = [];
    try {
      await db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(schema.blogArticles)
          .where(and(eq(schema.blogArticles.id, id), eq(schema.blogArticles.status, "scheduled"), lte(schema.blogArticles.scheduledAt, now)))
          .for("update", { skipLocked: true });
        if (!row) return;
        try {
          const result = await publishRow(tx, row, null);
          tags = blogTags(result.snapshot.slug);
          await audit({ actor: null, action: "blog.scheduled_published", resourceType: RESOURCE, resourceId: row.id, summary: `Publicou o artigo agendado ${row.title}`, changes: { status: { before: "scheduled", after: "published" } } }, tx);
          published.push(row.id);
        } catch (error) {
          if (!(error instanceof HttpError)) throw error;
          const reason = error.extra?.fields ? Object.values(error.extra.fields).join(" ") : error.message;
          await tx.update(schema.blogArticles).set({ status: "approved", scheduledAt: null, version: sql`${schema.blogArticles.version} + 1` }).where(eq(schema.blogArticles.id, row.id));
          await tx.insert(schema.blogComments).values({ articleId: row.id, authorUserId: null, kind: "comment", body: `A publicação agendada não aconteceu: ${reason}` });
          await audit({ actor: null, action: "blog.schedule_failed", resourceType: RESOURCE, resourceId: row.id, summary: `A publicação agendada do artigo ${row.title} falhou: ${reason}` }, tx);
          failed.push(row.id);
        }
      });
      if (tags.length) invalidate(...tags);
    } catch (error) {
      log.error("blog.schedule_error", { id, error });
    }
  }
  return { published, failed };
}

/* -------------------------------------------------------------------------- */
/* Categorias                                                                   */
/* -------------------------------------------------------------------------- */

export async function listCategories() {
  return getDb()
    .select({
      id: schema.blogCategories.id,
      slug: schema.blogCategories.slug,
      name: schema.blogCategories.name,
      description: schema.blogCategories.description,
      sortOrder: schema.blogCategories.sortOrder,
      version: schema.blogCategories.version,
      articles: sql<number>`(select count(*)::int from ${schema.blogArticles} a where a.category_id = ${schema.blogCategories.id})`,
    })
    .from(schema.blogCategories)
    .orderBy(asc(schema.blogCategories.sortOrder), asc(schema.blogCategories.name));
}

function translateTaxonomyError(error: unknown, what: string): never {
  const code = (error as { code?: string }).code;
  const constraint = (error as { constraint?: string }).constraint ?? "";
  if (code === "23505" && constraint.includes("slug")) throw new HttpError(409, "slug_taken", `Já existe ${what} com este endereço.`, { fields: { slug: "Este endereço já está em uso." } });
  if (code === "23505" && constraint.includes("user")) throw new HttpError(409, "user_taken", "Esta conta já tem um perfil de autor.", { fields: { userId: "Escolha outra conta." } });
  if (code === "23503") throw conflict(`Há artigos usando ${what}. Mova os artigos antes de excluir.`, "in_use");
  throw error;
}

export async function createCategory(user: SessionUser, input: CategoryInput, ctx: Ctx) {
  try {
    return await getDb().transaction(async (tx) => {
      const [row] = await tx.insert(schema.blogCategories).values(input).returning();
      await audit({ actor: actorOf(user), action: "blog.category_created", resourceType: "blog_category", resourceId: row.id, summary: `Criou a categoria ${input.name}`, ...ctx }, tx);
      invalidate(CACHE_TAGS.blog);
      return row;
    });
  } catch (error) {
    translateTaxonomyError(error, "uma categoria");
  }
}

export async function updateCategory(user: SessionUser, id: string, input: CategoryInput, expectedVersion: number, ctx: Ctx) {
  try {
    return await getDb().transaction(async (tx) => {
      if (!isUuid(id)) throw notFound("Categoria não encontrada.");
      const [current] = await tx.select().from(schema.blogCategories).where(eq(schema.blogCategories.id, id)).for("update");
      if (!current) throw notFound("Categoria não encontrada.");
      if (current.version !== expectedVersion) throw conflict("Esta categoria foi alterada por outra pessoa. Recarregue.", "stale");
      const [row] = await tx.update(schema.blogCategories).set({ ...input, updatedAt: new Date(), version: sql`${schema.blogCategories.version} + 1` }).where(eq(schema.blogCategories.id, id)).returning();
      await audit({ actor: actorOf(user), action: "blog.category_updated", resourceType: "blog_category", resourceId: id, summary: `Editou a categoria ${input.name}`, changes: diff(current, { ...current, ...input }), ...ctx }, tx);
      invalidate(CACHE_TAGS.blog);
      return row;
    });
  } catch (error) {
    translateTaxonomyError(error, "uma categoria");
  }
}

export async function deleteCategory(user: SessionUser, id: string, ctx: Ctx) {
  try {
    await getDb().transaction(async (tx) => {
      if (!isUuid(id)) throw notFound("Categoria não encontrada.");
      const [current] = await tx.select().from(schema.blogCategories).where(eq(schema.blogCategories.id, id)).for("update");
      if (!current) throw notFound("Categoria não encontrada.");
      await tx.delete(schema.blogCategories).where(eq(schema.blogCategories.id, id));
      await audit({ actor: actorOf(user), action: "blog.category_deleted", resourceType: "blog_category", resourceId: id, summary: `Excluiu a categoria ${current.name}`, ...ctx }, tx);
    });
    invalidate(CACHE_TAGS.blog);
  } catch (error) {
    translateTaxonomyError(error, "esta categoria");
  }
}

/* -------------------------------------------------------------------------- */
/* Autores                                                                      */
/* -------------------------------------------------------------------------- */

export async function listAuthors() {
  return getDb()
    .select({
      id: schema.blogAuthors.id,
      slug: schema.blogAuthors.slug,
      name: schema.blogAuthors.name,
      roleTitle: schema.blogAuthors.roleTitle,
      bio: schema.blogAuthors.bio,
      affiliation: schema.blogAuthors.affiliation,
      isActive: schema.blogAuthors.isActive,
      userId: schema.blogAuthors.userId,
      photoMediaId: schema.blogAuthors.photoMediaId,
      links: schema.blogAuthors.links,
      version: schema.blogAuthors.version,
      userEmail: schema.users.email,
      photoUrl: schema.media.url,
      articles: sql<number>`(select count(*)::int from ${schema.blogArticles} a where a.author_id = ${schema.blogAuthors.id})`,
    })
    .from(schema.blogAuthors)
    .leftJoin(schema.users, eq(schema.users.id, schema.blogAuthors.userId))
    .leftJoin(schema.media, eq(schema.media.id, schema.blogAuthors.photoMediaId))
    .orderBy(desc(schema.blogAuthors.isActive), asc(schema.blogAuthors.name));
}

/** Autores que aparecem no seletor do editor (ativos). */
export async function listAuthorOptions() {
  return getDb()
    .select({ id: schema.blogAuthors.id, name: schema.blogAuthors.name, affiliation: schema.blogAuthors.affiliation, userId: schema.blogAuthors.userId })
    .from(schema.blogAuthors)
    .where(eq(schema.blogAuthors.isActive, true))
    .orderBy(asc(schema.blogAuthors.name));
}

async function assertUserExists(tx: Tx, userId: string | null) {
  if (!userId) return;
  const [u] = await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, userId));
  if (!u) throw new HttpError(422, "user_missing", "Conta não encontrada.", { fields: { userId: "Escolha outra conta." } });
}

export async function createAuthor(user: SessionUser, input: AuthorInput, ctx: Ctx) {
  try {
    return await getDb().transaction(async (tx) => {
      await assertUserExists(tx, input.userId);
      const [row] = await tx.insert(schema.blogAuthors).values(input).returning();
      await syncAuthorUsages(tx, row);
      await audit({ actor: actorOf(user), action: "blog.author_created", resourceType: "blog_author", resourceId: row.id, summary: `Criou o autor ${input.name}`, ...ctx }, tx);
      return row;
    });
  } catch (error) {
    translateTaxonomyError(error, "um autor");
  }
}

export async function updateAuthor(user: SessionUser, id: string, input: AuthorInput, expectedVersion: number, ctx: Ctx) {
  try {
    return await getDb().transaction(async (tx) => {
      if (!isUuid(id)) throw notFound("Autor não encontrado.");
      const [current] = await tx.select().from(schema.blogAuthors).where(eq(schema.blogAuthors.id, id)).for("update");
      if (!current) throw notFound("Autor não encontrado.");
      if (current.version !== expectedVersion) throw conflict("Este autor foi alterado por outra pessoa. Recarregue.", "stale");
      await assertUserExists(tx, input.userId);
      const [row] = await tx.update(schema.blogAuthors).set({ ...input, updatedAt: new Date(), version: sql`${schema.blogAuthors.version} + 1` }).where(eq(schema.blogAuthors.id, id)).returning();
      await syncAuthorUsages(tx, row);
      await audit({ actor: actorOf(user), action: "blog.author_updated", resourceType: "blog_author", resourceId: id, summary: `Editou o autor ${input.name}`, changes: diff(current, { ...current, ...input }), ...ctx }, tx);
      invalidate(CACHE_TAGS.blog);
      return row;
    });
  } catch (error) {
    translateTaxonomyError(error, "este autor");
  }
}

export async function deleteAuthor(user: SessionUser, id: string, ctx: Ctx) {
  try {
    await getDb().transaction(async (tx) => {
      if (!isUuid(id)) throw notFound("Autor não encontrado.");
      const [current] = await tx.select().from(schema.blogAuthors).where(eq(schema.blogAuthors.id, id)).for("update");
      if (!current) throw notFound("Autor não encontrado.");
      await syncMediaUsages(tx, "blog_author", id, []);
      await tx.delete(schema.blogAuthors).where(eq(schema.blogAuthors.id, id));
      await audit({ actor: actorOf(user), action: "blog.author_deleted", resourceType: "blog_author", resourceId: id, summary: `Excluiu o autor ${current.name}`, ...ctx }, tx);
    });
    invalidate(CACHE_TAGS.blog);
  } catch (error) {
    translateTaxonomyError(error, "este autor");
  }
}

/** Contas que podem ser ligadas a um perfil de autor (ativas e ainda sem perfil). */
export async function listLinkableUsers(exceptAuthorId?: string) {
  return getDb()
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .leftJoin(schema.blogAuthors, eq(schema.blogAuthors.userId, schema.users.id))
    .where(or(isNull(schema.blogAuthors.id), exceptAuthorId ? eq(schema.blogAuthors.id, exceptAuthorId) : undefined))
    .orderBy(asc(schema.users.name));
}

export { blogTags };
