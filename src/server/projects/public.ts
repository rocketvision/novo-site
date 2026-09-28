import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { ProjectImage, ProjectSnapshot, PublicProject } from "@/lib/projects/types";
import { CACHE_TAGS } from "@/server/cache";
import { getDb, isDatabaseConfigured, schema } from "@/server/db";
import { isPreviewing } from "@/server/content/public";
import { log } from "@/server/log";
import { buildSnapshot, toInput } from "./service";

/**
 * Leitura dos projetos pelo site público.
 *
 * - Só projetos com status "published", sempre a partir do snapshot congelado na publicação.
 * - Em cache com tags (lista: `projects`; página: `project:<slug>`), invalidadas ao publicar,
 *   despublicar, arquivar, reordenar ou destacar.
 * - Na pré-visualização de quem está logado, a página do projeto mostra a cópia de trabalho.
 */

type MediaRow = { id: string; url: string; alt: string; width: number; height: number; blurDataUrl: string | null };

function mediaIds(s: ProjectSnapshot) {
  return [s.coverMediaId, s.logoMediaId, s.ogMediaId, s.desktopMediaId, ...s.phoneMediaIds, ...s.gallery.map((g) => g.mediaId)].filter(Boolean) as string[];
}

async function loadMedia(ids: string[]) {
  if (ids.length === 0) return new Map<string, MediaRow>();
  const rows = await getDb()
    .select({ id: schema.media.id, url: schema.media.url, alt: schema.media.alt, width: schema.media.width, height: schema.media.height, blurDataUrl: schema.media.blurDataUrl })
    .from(schema.media)
    .where(inArray(schema.media.id, [...new Set(ids)]));
  return new Map(rows.map((r) => [r.id, r]));
}

function image(media: Map<string, MediaRow>, id: string | null, fallbackAlt: string): ProjectImage | null {
  const m = id ? media.get(id) : undefined;
  if (!m) return null;
  return { src: m.url, alt: m.alt || fallbackAlt, width: m.width, height: m.height, ...(m.blurDataUrl && { blurDataURL: m.blurDataUrl }) };
}

function resolve(id: string, featured: boolean, s: ProjectSnapshot, media: Map<string, MediaRow>): PublicProject {
  const phones = s.phoneMediaIds.map((m, i) => image(media, m, `Tela ${i + 1} do projeto ${s.name} no celular`)).filter((x): x is ProjectImage => x !== null);
  return {
    id,
    featured,
    slug: s.slug,
    name: s.name,
    client: s.client,
    category: s.category,
    projectDate: s.projectDate,
    year: s.projectDate ? s.projectDate.slice(0, 4) : "",
    summary: s.summary,
    description: s.description,
    context: s.context,
    solution: s.solution,
    results: s.results,
    services: s.services,
    highlights: s.highlights,
    theme: s.theme,
    externalUrl: s.externalUrl,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    sample: s.sample,
    cover: image(media, s.coverMediaId, `Projeto ${s.name}`),
    logo: image(media, s.logoMediaId, `Logo ${s.client || s.name}`),
    og: image(media, s.ogMediaId, `Projeto ${s.name}`),
    screens: { desktop: image(media, s.desktopMediaId, `Tela do projeto ${s.name}`), phones },
    gallery: s.gallery
      .map((g, i) => {
        const img = image(media, g.mediaId, g.caption || `Imagem ${i + 1} do projeto ${s.name}`);
        return img ? { ...img, caption: g.caption } : null;
      })
      .filter((x): x is ProjectImage & { caption: string } => x !== null),
  };
}

async function resolveMany(rows: { id: string; featured: boolean; snapshot: unknown }[]) {
  const snapshots = rows.map((r) => ({ ...r, snapshot: r.snapshot as ProjectSnapshot }));
  const media = await loadMedia(snapshots.flatMap((r) => mediaIds(r.snapshot)));
  return snapshots.map((r) => resolve(r.id, r.featured, r.snapshot, media));
}

const listPublished = unstable_cache(
  async () => {
    const rows = await getDb()
      .select({ id: schema.projects.id, featured: schema.projects.featured, snapshot: schema.projects.publishedSnapshot })
      .from(schema.projects)
      .where(eq(schema.projects.status, "published"))
      .orderBy(desc(schema.projects.featured), asc(schema.projects.sortOrder));
    return resolveMany(rows);
  },
  ["published-projects"],
  { tags: [CACHE_TAGS.projects, CACHE_TAGS.media] },
);

export async function getPublishedProjects(): Promise<PublicProject[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await listPublished();
  } catch (error) {
    log.error("projects.list_failed", { error });
    return [];
  }
}

function publishedBySlug(slug: string) {
  return unstable_cache(
    async () => {
      const rows = await getDb()
        .select({ id: schema.projects.id, featured: schema.projects.featured, snapshot: schema.projects.publishedSnapshot })
        .from(schema.projects)
        .where(and(eq(schema.projects.status, "published"), sql`${schema.projects.publishedSnapshot} ->> 'slug' = ${slug}`))
        .limit(1);
      return rows.length ? (await resolveMany(rows))[0] : null;
    },
    ["published-project", slug],
    { tags: [CACHE_TAGS.project(slug), CACHE_TAGS.projects, CACHE_TAGS.media] },
  );
}

/** Cópia de trabalho de um projeto (rascunho ou publicado com alterações), só para a pré-visualização. */
async function workingCopyBySlug(slug: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.slug, slug), ne(schema.projects.status, "archived")))
    .limit(1);
  if (!row) return null;
  const images = await db.select().from(schema.projectImages).where(eq(schema.projectImages.projectId, row.id)).orderBy(asc(schema.projectImages.role), asc(schema.projectImages.position));
  const snapshot = buildSnapshot(row, toInput(row, images));
  return (await resolveMany([{ id: row.id, featured: row.featured, snapshot }]))[0];
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Projeto publicado pelo endereço. Nulo para inexistente, rascunho, despublicado ou arquivado. */
export async function getPublicProject(slug: string): Promise<PublicProject | null> {
  if (!SLUG.test(slug) || slug.length > 60 || !isDatabaseConfigured()) return null;
  if (await isPreviewing()) {
    try {
      const draft = await workingCopyBySlug(slug);
      if (draft) return draft;
    } catch (error) {
      log.error("projects.preview_failed", { slug, error });
    }
  }
  try {
    return await publishedBySlug(slug)();
  } catch (error) {
    // Erro de banco não pode virar "projeto inexistente" em cache: sobe e a página mostra o erro.
    log.error("projects.load_failed", { slug, error });
    throw error;
  }
}

/** Endereços publicados, para o sitemap e a geração estática. */
export async function getPublishedSlugs() {
  const projects = await getPublishedProjects();
  return projects.map((p) => ({ slug: p.slug, sample: p.sample }));
}
