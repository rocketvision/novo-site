import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { ProjectImage } from "@/lib/projects/types";
import { documentStats, headingsOf, mediaIdsOf, type BlogDocument } from "@/lib/blog/document";
import type { BlogSnapshot, PublicArticle, PublicArticleCard, PublicAuthor, PublicCategory } from "@/lib/blog/types";
import { getSession } from "@/server/auth/session";
import { CACHE_TAGS } from "@/server/cache";
import { getDb, isDatabaseConfigured, schema } from "@/server/db";
import { log } from "@/server/log";
import { getArticleForPreview, publishDueArticles } from "./service";

/**
 * Leitura do Blog pelo site público.
 *
 * - Só artigos com status "published", sempre a partir do snapshot congelado na publicação.
 *   Rascunhos, revisões, agendados e arquivados nunca aparecem (nem na busca, nem no RSS, nem no sitemap).
 * - Em cache com tags: `blog` (listas) e `blog:<slug>` (página), invalidadas a cada publicação.
 * - Antes de ler, promove os artigos agendados que já venceram. É a rede de segurança do cron:
 *   mesmo que ele atrase, o artigo entra no ar na primeira visita depois do horário.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const BLOG_PAGE_SIZE = 9;

/* -------------------------------------------------------------------------- */
/* Agendamento                                                                  */
/* -------------------------------------------------------------------------- */

let lastDueCheck = 0;

/** No máximo uma verificação a cada 30 s por instância; o cron cobre o resto. */
export async function publishDueIfNeeded() {
  if (!isDatabaseConfigured() || Date.now() - lastDueCheck < 30_000) return;
  lastDueCheck = Date.now();
  try {
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.blogArticles)
      .where(and(eq(schema.blogArticles.status, "scheduled"), sql`${schema.blogArticles.scheduledAt} <= now()`));
    if (row?.n) await publishDueArticles();
  } catch (error) {
    log.error("blog.due_check_failed", { error });
  }
}

/* -------------------------------------------------------------------------- */
/* Montagem                                                                     */
/* -------------------------------------------------------------------------- */

type MediaRow = { id: string; url: string; alt: string; width: number; height: number; blurDataUrl: string | null };

async function loadMedia(ids: (string | null)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (unique.length === 0) return new Map<string, MediaRow>();
  const rows = await getDb()
    .select({ id: schema.media.id, url: schema.media.url, alt: schema.media.alt, width: schema.media.width, height: schema.media.height, blurDataUrl: schema.media.blurDataUrl })
    .from(schema.media)
    .where(inArray(schema.media.id, unique));
  return new Map(rows.map((r) => [r.id, r]));
}

function image(media: Map<string, MediaRow>, id: string | null, alt: string): ProjectImage | null {
  const m = id ? media.get(id) : undefined;
  if (!m) return null;
  return { src: m.url, alt: alt || m.alt, width: m.width, height: m.height, ...(m.blurDataUrl && { blurDataURL: m.blurDataUrl }) };
}

async function loadTaxonomies() {
  const db = getDb();
  const [categories, authors] = await Promise.all([db.select().from(schema.blogCategories), db.select().from(schema.blogAuthors)]);
  return { categories: new Map(categories.map((c) => [c.id, c])), authors: new Map(authors.map((a) => [a.id, a])) };
}

type Taxonomies = Awaited<ReturnType<typeof loadTaxonomies>>;

function publicCategory(t: Taxonomies, id: string): PublicCategory {
  const c = t.categories.get(id);
  return c ? { slug: c.slug, name: c.name, description: c.description } : { slug: "geral", name: "Geral", description: "" };
}

function publicAuthor(t: Taxonomies, media: Map<string, MediaRow>, id: string): PublicAuthor {
  const a = t.authors.get(id);
  if (!a) return { slug: "", name: "Rocket Vision", roleTitle: "", bio: "", affiliation: "team", photo: null, links: [] };
  return {
    slug: a.slug,
    name: a.name,
    roleTitle: a.roleTitle,
    bio: a.bio,
    affiliation: a.affiliation,
    photo: image(media, a.photoMediaId, `Foto de ${a.name}`),
    links: Array.isArray(a.links) ? (a.links as { label: string; url: string }[]) : [],
  };
}

type CardSource = { id: string; featured: boolean; publishedAt: Date | null; snapshot: Omit<BlogSnapshot, "content" | "toc"> };

async function toCards(rows: CardSource[]): Promise<PublicArticleCard[]> {
  if (rows.length === 0) return [];
  const t = await loadTaxonomies();
  const media = await loadMedia([...rows.map((r) => r.snapshot.coverMediaId), ...[...t.authors.values()].map((a) => a.photoMediaId)]);
  return rows.map((r) => card(r, t, media));
}

function card(r: CardSource, t: Taxonomies, media: Map<string, MediaRow>): PublicArticleCard {
  const s = r.snapshot;
  const published = (r.publishedAt ?? new Date(s.frozenAt)).toISOString();
  return {
    id: r.id,
    slug: s.slug,
    title: s.title,
    subtitle: s.subtitle,
    excerpt: s.excerpt,
    featured: r.featured,
    readingMinutes: s.readingMinutes,
    publishedAt: published,
    updatedAt: s.revisedAt ?? published,
    cover: image(media, s.coverMediaId, s.coverAlt),
    category: publicCategory(t, s.categoryId),
    author: publicAuthor(t, media, s.authorId),
  };
}

/* -------------------------------------------------------------------------- */
/* Listas                                                                       */
/* -------------------------------------------------------------------------- */

/** Todos os artigos no ar, do mais recente para o mais antigo (sem o corpo do texto). */
const listPublishedCards = unstable_cache(
  async () => {
    const rows = await getDb()
      .select({
        id: schema.blogArticles.id,
        featured: schema.blogArticles.featured,
        publishedAt: schema.blogArticles.publishedAt,
        snapshot: sql<CardSource["snapshot"]>`${schema.blogArticles.publishedSnapshot} - 'content' - 'toc'`,
      })
      .from(schema.blogArticles)
      .where(eq(schema.blogArticles.status, "published"))
      .orderBy(desc(schema.blogArticles.publishedAt))
      .limit(1000);
    return toCards(rows);
  },
  ["blog-cards"],
  { tags: [CACHE_TAGS.blog, CACHE_TAGS.media], revalidate: 3600 },
);

export async function getPublishedCards(): Promise<PublicArticleCard[]> {
  if (!isDatabaseConfigured()) return [];
  await publishDueIfNeeded();
  try {
    return await listPublishedCards();
  } catch (error) {
    log.error("blog.list_failed", { error });
    return [];
  }
}

export function paginate<T>(items: T[], page: number, size = BLOG_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}

/** Categorias com pelo menos um artigo no ar, na ordem definida no Studio. */
export const getPublicCategories = unstable_cache(
  async () => {
    if (!isDatabaseConfigured()) return [] as (PublicCategory & { count: number })[];
    const rows = await getDb()
      .select({
        slug: schema.blogCategories.slug,
        name: schema.blogCategories.name,
        description: schema.blogCategories.description,
        count: sql<number>`count(${schema.blogArticles.id})::int`,
      })
      .from(schema.blogCategories)
      .innerJoin(schema.blogArticles, and(eq(schema.blogArticles.status, "published"), sql`${schema.blogArticles.publishedSnapshot} ->> 'categoryId' = ${schema.blogCategories.id}::text`))
      .groupBy(schema.blogCategories.id)
      .orderBy(schema.blogCategories.sortOrder, schema.blogCategories.name);
    return rows;
  },
  ["blog-categories"],
  { tags: [CACHE_TAGS.blog], revalidate: 3600 },
);

export async function getCategoryBySlug(slug: string) {
  if (!SLUG.test(slug)) return null;
  const categories = await getPublicCategories().catch(() => []);
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getPublicAuthor(slug: string): Promise<PublicAuthor | null> {
  if (!SLUG.test(slug) || slug.length > 90) return null;
  const cards = await getPublishedCards();
  return cards.find((c) => c.author.slug === slug)?.author ?? null;
}

/* -------------------------------------------------------------------------- */
/* Artigo                                                                       */
/* -------------------------------------------------------------------------- */

async function resolveArticle(row: { id: string; featured: boolean; publishedAt: Date | null; firstPublishedAt: Date | null }, s: BlogSnapshot): Promise<PublicArticle> {
  const t = await loadTaxonomies();
  const media = await loadMedia([s.coverMediaId, ...mediaIdsOf(s.content), ...[...t.authors.values()].map((a) => a.photoMediaId)]);
  const bodyMedia: PublicArticle["media"] = {};
  for (const id of mediaIdsOf(s.content)) {
    const m = media.get(id);
    if (m) bodyMedia[id] = { url: m.url, width: m.width, height: m.height, blurDataUrl: m.blurDataUrl };
  }
  const base = card({ id: row.id, featured: row.featured, publishedAt: row.publishedAt, snapshot: s }, t, media);
  return {
    ...base,
    content: s.content,
    toc: s.toc,
    coverCaption: s.coverCaption,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    firstPublishedAt: (row.firstPublishedAt ?? row.publishedAt ?? new Date(s.frozenAt)).toISOString(),
    media: bodyMedia,
  };
}

function publishedBySlug(slug: string) {
  return unstable_cache(
    async () => {
      const [row] = await getDb()
        .select({
          id: schema.blogArticles.id,
          featured: schema.blogArticles.featured,
          publishedAt: schema.blogArticles.publishedAt,
          firstPublishedAt: schema.blogArticles.firstPublishedAt,
          snapshot: schema.blogArticles.publishedSnapshot,
        })
        .from(schema.blogArticles)
        .where(and(eq(schema.blogArticles.status, "published"), sql`${schema.blogArticles.publishedSnapshot} ->> 'slug' = ${slug}`))
        .limit(1);
      return row ? resolveArticle(row, row.snapshot as BlogSnapshot) : null;
    },
    ["blog-article", slug],
    { tags: [CACHE_TAGS.blogArticle(slug), CACHE_TAGS.blog, CACHE_TAGS.media], revalidate: 3600 },
  );
}

/** Quem está pré-visualizando o Blog (modo de pré-visualização ligado e acesso ao Blog no Studio). */
const blogPreviewer = cache(async () => {
  const draft = await draftMode();
  if (!draft.isEnabled) return null;
  const session = await getSession().catch(() => null);
  return session && session.user.permissions.has("blog.view") ? session.user : null;
});

/** Cópia de trabalho do artigo, para quem pode vê-lo no Studio. */
async function previewBySlug(slug: string): Promise<PublicArticle | null> {
  const user = await blogPreviewer();
  if (!user) return null;
  const [found] = await getDb().select({ id: schema.blogArticles.id }).from(schema.blogArticles).where(eq(schema.blogArticles.slug, slug)).limit(1);
  if (!found) return null;
  const row = await getArticleForPreview(user, found.id).catch(() => null);
  if (!row) return null;
  const content = row.content as BlogDocument;
  const stats = documentStats(content);
  const now = new Date().toISOString();
  const snapshot: BlogSnapshot = {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    content,
    toc: headingsOf(content),
    categoryId: row.categoryId ?? "",
    authorId: row.authorId ?? "",
    coverMediaId: row.coverMediaId ?? "",
    coverAlt: row.coverAlt,
    coverCaption: row.coverCaption,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    readingMinutes: stats.minutes,
    words: stats.words,
    frozenAt: now,
    revisedAt: null,
  };
  const article = await resolveArticle({ id: row.id, featured: row.featured, publishedAt: row.publishedAt ?? new Date(), firstPublishedAt: row.firstPublishedAt }, snapshot);
  return { ...article, preview: true };
}

/** Artigo publicado pelo endereço. Nulo para inexistente, rascunho, agendado, despublicado ou arquivado. */
export async function getPublicArticle(slug: string): Promise<PublicArticle | null> {
  if (!SLUG.test(slug) || slug.length > 90 || !isDatabaseConfigured()) return null;
  try {
    const preview = await previewBySlug(slug);
    if (preview) return preview;
  } catch (error) {
    log.error("blog.preview_failed", { slug, error });
  }
  await publishDueIfNeeded();
  try {
    return await publishedBySlug(slug)();
  } catch (error) {
    // Erro de banco não pode virar "artigo inexistente" em cache: sobe e a página mostra o erro.
    log.error("blog.load_failed", { slug, error });
    throw error;
  }
}

/** Relacionados: mesma categoria primeiro, depois os mais recentes. */
export async function getRelatedArticles(article: Pick<PublicArticleCard, "id" | "category">, limit = 3) {
  const cards = await getPublishedCards();
  const others = cards.filter((c) => c.id !== article.id);
  const same = others.filter((c) => c.category.slug === article.category.slug);
  return [...same, ...others.filter((c) => c.category.slug !== article.category.slug)].slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Busca                                                                        */
/* -------------------------------------------------------------------------- */

/** Busca de texto no que está no ar (sem acento, com radicais do português). Sem cache: é limitada por IP na página. */
export async function searchArticles(q: string, limit = 30): Promise<PublicArticleCard[]> {
  const query = q.trim().slice(0, 80);
  if (query.length < 2 || !isDatabaseConfigured()) return [];
  const rows = await getDb()
    .select({ id: schema.blogArticles.id })
    .from(schema.blogArticles)
    .where(and(eq(schema.blogArticles.status, "published"), sql`${schema.blogArticles.searchVector} @@ websearch_to_tsquery('portuguese', unaccent(${query}))`))
    .orderBy(sql`ts_rank(${schema.blogArticles.searchVector}, websearch_to_tsquery('portuguese', unaccent(${query}))) DESC`)
    .limit(limit);
  const cards = await getPublishedCards();
  const byId = new Map(cards.map((c) => [c.id, c]));
  return rows.map((r) => byId.get(r.id)).filter((c): c is PublicArticleCard => Boolean(c));
}

/** Endereços publicados, para o sitemap e o RSS. */
export async function getBlogSitemapEntries() {
  const cards = await getPublishedCards();
  const categories = await getPublicCategories().catch(() => []);
  const authors = [...new Map(cards.filter((c) => c.author.slug).map((c) => [c.author.slug, c])).values()];
  return { cards, categories, authors };
}
