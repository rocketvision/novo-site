import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { unstable_cache } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { DEFAULT_CONTENT } from "@/lib/content/defaults";
import { SECTION_SCHEMAS, type SectionContent, type SectionKey } from "@/lib/content/schemas";
import type { LandingContent, Resolved, ResolvedImage } from "@/lib/content/resolved";
import { getSession } from "@/server/auth/session";
import { CACHE_TAGS } from "@/server/cache";
import { getDb, isDatabaseConfigured, schema } from "@/server/db";
import { log } from "@/server/log";
import { collectImageRefs, isImageField } from "./refs";
import { canPreview } from "./access";
import { sectionTag } from "./sections";

/**
 * Leitura do conteúdo pelo site público.
 *
 * - Sempre a versão publicada, em cache por seção (tag `section:<chave>`), invalidada só ao publicar.
 * - Com o modo de pré-visualização ativo E uma sessão com permissão, lê o rascunho, sem cache.
 * - Se o banco falhar (ou não estiver configurado), o site continua no ar com o conteúdo embutido.
 */

type MediaInfo = { url: string; alt: string; blurDataUrl: string | null };

async function loadMedia(ids: string[]) {
  if (ids.length === 0) return new Map<string, MediaInfo>();
  const rows = await getDb()
    .select({ id: schema.media.id, url: schema.media.url, alt: schema.media.alt, blurDataUrl: schema.media.blurDataUrl })
    .from(schema.media)
    .where(inArray(schema.media.id, [...new Set(ids)]));
  return new Map(rows.map((r) => [r.id, r]));
}

/** Troca cada campo de imagem pela foto pronta para o <Image>: arquivo da biblioteca ou a foto original. */
function resolveImages(value: unknown, media: Map<string, MediaInfo>): unknown {
  if (isImageField(value)) {
    const file = value.mediaId ? media.get(value.mediaId) : undefined;
    if (file) {
      return { src: file.url, alt: value.alt || file.alt, ...(file.blurDataUrl && { blurDataURL: file.blurDataUrl }) } satisfies ResolvedImage;
    }
    // Sem arquivo na biblioteca: a seção decide como seguir sem a imagem.
    return null;
  }
  if (Array.isArray(value)) return value.map((v) => resolveImages(v, media));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveImages(v, media)]));
  }
  return value;
}

async function resolve<K extends SectionKey>(content: SectionContent<K>): Promise<Resolved<K>> {
  const media = await loadMedia(collectImageRefs(content).map((r) => r.mediaId));
  return resolveImages(content, media) as Resolved<K>;
}

function parse<K extends SectionKey>(key: K, value: unknown): SectionContent<K> | null {
  const parsed = SECTION_SCHEMAS[key].safeParse(value);
  if (!parsed.success) {
    log.error("content.invalid_stored_section", { key, issues: parsed.error.issues.length });
    return null;
  }
  return parsed.data as SectionContent<K>;
}

const DEFAULTS_RESOLVED = <K extends SectionKey>(key: K) => resolveImages(DEFAULT_CONTENT[key], new Map()) as Resolved<K>;

/**
 * O cache guarda só dados do banco (conteúdo publicado e as mídias que ele usa), nunca as fotos
 * embutidas já resolvidas: o caminho delas muda a cada build, e um cache que sobrevive ao deploy
 * apontaria para arquivos que não existem mais.
 */
type CachedSection<K extends SectionKey> = { content: SectionContent<K> | null; media: [string, MediaInfo][] };

function publishedLoader<K extends SectionKey>(key: K) {
  return unstable_cache(
    async (): Promise<CachedSection<K>> => {
      const [row] = await getDb()
        .select({ published: schema.contentSections.published })
        .from(schema.contentSections)
        .where(eq(schema.contentSections.key, key));
      const content = row?.published ? parse(key, row.published) : null;
      const media = content ? await loadMedia(collectImageRefs(content).map((r) => r.mediaId)) : new Map<string, MediaInfo>();
      return { content, media: [...media] };
    },
    ["published-section-data", key],
    { tags: [sectionTag(key), CACHE_TAGS.media] },
  );
}

const loaders = new Map<SectionKey, () => Promise<unknown>>();

async function getPublished<K extends SectionKey>(key: K): Promise<Resolved<K>> {
  if (!isDatabaseConfigured()) return DEFAULTS_RESOLVED(key);
  let loader = loaders.get(key);
  if (!loader) {
    loader = publishedLoader(key);
    loaders.set(key, loader);
  }
  try {
    const { content, media } = (await loader()) as CachedSection<K>;
    return content ? (resolveImages(content, new Map(media)) as Resolved<K>) : DEFAULTS_RESOLVED(key);
  } catch (error) {
    // Erro não entra no cache: a próxima requisição tenta de novo.
    log.error("content.load_failed", { key, error });
    return DEFAULTS_RESOLVED(key);
  }
}

async function getDraft<K extends SectionKey>(key: K): Promise<Resolved<K>> {
  const [row] = await getDb()
    .select({ draft: schema.contentSections.draft })
    .from(schema.contentSections)
    .where(eq(schema.contentSections.key, key));
  const content = row ? parse(key, row.draft) : null;
  return content ? resolve(content) : DEFAULTS_RESOLVED(key);
}

/**
 * Pré-visualização vale só para quem está logado e pode ver a landing.
 * O cookie de draft mode sozinho não basta: sem sessão válida, o site mostra o publicado.
 */
export const isPreviewing = cache(async () => {
  const draft = await draftMode();
  if (!draft.isEnabled) return false;
  const session = await getSession().catch(() => null);
  return session ? canPreview(session.user.permissions) : false;
});

export async function getSectionContent<K extends SectionKey>(key: K): Promise<Resolved<K>> {
  if (await isPreviewing()) {
    try {
      return await getDraft(key);
    } catch (error) {
      log.error("content.preview_failed", { key, error });
    }
  }
  return getPublished(key);
}

export async function getLandingContent(): Promise<LandingContent> {
  const keys = Object.keys(SECTION_SCHEMAS) as SectionKey[];
  const entries = await Promise.all(keys.map(async (k) => [k, await getSectionContent(k)] as const));
  return Object.fromEntries(entries) as LandingContent;
}
