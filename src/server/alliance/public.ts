import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, or, gte, sql } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { getDb, isDatabaseConfigured, schema } from "@/server/db";
import { log } from "@/server/log";
import { MODALITIES, MODALITY_KEYS, TIERS, TIER_KEYS, type TierKey } from "@/lib/alliance/constants";
import { partnerPageSchema } from "@/lib/alliance/page-blocks";
import type { DirectoryCard, PartnerSnapshot, PublicImage, PublicPartner } from "@/lib/alliance/types";
import type { ProjectSnapshot } from "@/lib/projects/types";
import { buildPartnerSnapshot, toPartnerInput } from "./partners";
import { listModalities, listTiers, type ModalityRow, type TierRow } from "./settings";
import { ALLIANCE_TAGS } from "./tags";
import { CACHE_MAX_AGE, CACHE_TAGS } from "@/server/cache";

/**
 * Leitura do Rocket Alliance pelo site público.
 *
 * - Só parceiros com publicação habilitada, snapshot e situação ativa ou em onboarding.
 * - Em cache por tag (diretório, página de cada parceiro, programa), invalidada ao publicar.
 * - Pré-visualização: com o modo de rascunho ativo e uma sessão do Studio que vê o Rocket Alliance,
 *   a página do parceiro mostra a cópia de trabalho (mesmo antes de publicar).
 * - Banco fora do ar: o programa usa os textos oficiais do código e o diretório fica vazio.
 */

const VISIBLE = sql`${schema.partners.directoryEnabled} = true AND ${schema.partners.publishedSnapshot} IS NOT NULL AND ${schema.partners.status} IN ('active', 'onboarding')`;

type MediaRow = { id: string; url: string; alt: string; width: number; height: number; blurDataUrl: string | null };

async function loadMedia(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (unique.length === 0) return new Map<string, MediaRow>();
  const rows = await getDb()
    .select({ id: schema.media.id, url: schema.media.url, alt: schema.media.alt, width: schema.media.width, height: schema.media.height, blurDataUrl: schema.media.blurDataUrl })
    .from(schema.media)
    .where(inArray(schema.media.id, unique));
  return new Map(rows.map((r) => [r.id, r]));
}

function image(media: Map<string, MediaRow>, id: string | null, alt: string): PublicImage | null {
  const m = id ? media.get(id) : undefined;
  if (!m) return null;
  return { src: m.url, alt: m.alt || alt, width: m.width, height: m.height, ...(m.blurDataUrl && { blurDataURL: m.blurDataUrl }) };
}

/* -------------------------------------------------------------------------- */
/* Diretório                                                                   */
/* -------------------------------------------------------------------------- */

const directoryLoader = unstable_cache(
  async (): Promise<DirectoryCard[]> => {
    const rows = await getDb()
      .select({ id: schema.partners.id, featured: schema.partners.featured, snapshot: schema.partners.publishedSnapshot })
      .from(schema.partners)
      .where(VISIBLE)
      .orderBy(desc(schema.partners.featured), asc(schema.partners.sortOrder), asc(schema.partners.tradeName));
    const snaps = rows.map((r) => ({ ...r, snapshot: r.snapshot as PartnerSnapshot }));
    const media = await loadMedia(snaps.flatMap((r) => [r.snapshot.logoMediaId, r.snapshot.logoAltMediaId, r.snapshot.coverMediaId]));
    return snaps.map(({ id, featured, snapshot: s }) => ({
      id,
      featured,
      slug: s.slug,
      tradeName: s.tradeName,
      sector: s.sector,
      shortDescription: s.shortDescription,
      location: s.location,
      modalities: s.modalities,
      tierKey: s.tierKey,
      accentColor: s.accentColor,
      logo: image(media, s.logoMediaId, `Logotipo ${s.tradeName}`),
      logoAlt: image(media, s.logoAltMediaId, `Logotipo ${s.tradeName}`),
      cover: image(media, s.coverMediaId, `${s.tradeName}`),
    }));
  },
  ["alliance-directory"],
  { tags: [ALLIANCE_TAGS.directory, CACHE_TAGS.media], revalidate: CACHE_MAX_AGE },
);

export async function getDirectory(): Promise<DirectoryCard[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await directoryLoader();
  } catch (error) {
    log.error("alliance.directory_failed", { error });
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Página exclusiva                                                            */
/* -------------------------------------------------------------------------- */

async function resolvePartner(id: string, featured: boolean, s: PartnerSnapshot, publishedAt: Date | null): Promise<PublicPartner> {
  const projectRows = s.projectIds.length
    ? await getDb()
        .select({ id: schema.projects.id, snapshot: schema.projects.publishedSnapshot })
        .from(schema.projects)
        .where(and(inArray(schema.projects.id, s.projectIds), eq(schema.projects.status, "published"), eq(schema.projects.isSample, false)))
    : [];
  const projects = s.projectIds.flatMap((pid) => {
    const row = projectRows.find((r) => r.id === pid);
    return row ? [row.snapshot as ProjectSnapshot] : [];
  });
  const media = await loadMedia([s.logoMediaId, s.logoAltMediaId, s.coverMediaId, s.ogMediaId, ...s.gallery.map((g) => g.mediaId), ...projects.map((p) => p.coverMediaId ?? p.desktopMediaId)]);
  return {
    ...s,
    id,
    featured,
    publishedAt: publishedAt?.toISOString() ?? null,
    logo: image(media, s.logoMediaId, `Logotipo ${s.tradeName}`),
    logoAlt: image(media, s.logoAltMediaId, `Logotipo ${s.tradeName}`),
    cover: image(media, s.coverMediaId, s.tradeName),
    og: image(media, s.ogMediaId, s.tradeName),
    gallery: s.gallery.flatMap((g, i) => {
      const img = image(media, g.mediaId, g.caption || `${s.tradeName}, imagem ${i + 1}`);
      return img ? [{ ...img, caption: g.caption }] : [];
    }),
    projects: projects.map((p) => ({ slug: p.slug, name: p.name, category: p.category, summary: p.summary, cover: image(media, p.coverMediaId ?? p.desktopMediaId, `Projeto ${p.name}`) })),
  };
}

function partnerLoader(slug: string) {
  return unstable_cache(
    async (): Promise<PublicPartner | null> => {
      const [row] = await getDb()
        .select({ id: schema.partners.id, featured: schema.partners.featured, snapshot: schema.partners.publishedSnapshot, publishedAt: schema.partners.publishedAt })
        .from(schema.partners)
        .where(and(VISIBLE, sql`${schema.partners.publishedSnapshot} ->> 'slug' = ${slug}`));
      if (!row) return null;
      const snapshot = row.snapshot as PartnerSnapshot;
      // Snapshot de uma versão antiga com página inválida: mostra sem os blocos em vez de quebrar.
      const page = partnerPageSchema.safeParse(snapshot.page);
      return resolvePartner(row.id, row.featured, { ...snapshot, page: page.success ? page.data : { hero: { title: "", subtitle: "" }, blocks: [] } }, row.publishedAt);
    },
    ["alliance-partner", slug],
    { tags: [ALLIANCE_TAGS.partner(slug), ALLIANCE_TAGS.directory, CACHE_TAGS.media, CACHE_TAGS.projects], revalidate: CACHE_MAX_AGE },
  );
}

/** Pré-visualização do Studio: rascunho só para quem está logado e vê o Rocket Alliance. */
export const isPreviewingAlliance = cache(async () => {
  const draft = await draftMode();
  if (!draft.isEnabled) return false;
  const session = await getSession().catch(() => null);
  return Boolean(session?.user.permissions.has("alliance.view"));
});

async function draftPartner(slug: string): Promise<PublicPartner | null> {
  const db = getDb();
  const [row] = await db.select().from(schema.partners).where(eq(schema.partners.slug, slug));
  if (!row) return null;
  const [modalities, gallery, projects, page] = await Promise.all([
    db.select({ key: schema.partnerModalityLinks.modalityKey }).from(schema.partnerModalityLinks).where(eq(schema.partnerModalityLinks.partnerId, row.id)),
    db.select().from(schema.partnerMedia).where(eq(schema.partnerMedia.partnerId, row.id)).orderBy(asc(schema.partnerMedia.position)),
    db.select().from(schema.partnerProjects).where(eq(schema.partnerProjects.partnerId, row.id)).orderBy(asc(schema.partnerProjects.position)),
    db.select().from(schema.partnerPages).where(eq(schema.partnerPages.partnerId, row.id)),
  ]);
  const input = toPartnerInput(row, { modalities: modalities.map((m) => m.key), gallery: gallery.map((g) => ({ mediaId: g.mediaId, caption: g.caption })), projectIds: projects.map((p) => p.projectId) });
  const parsed = partnerPageSchema.safeParse(page[0]?.content);
  return resolvePartner(row.id, row.featured, buildPartnerSnapshot(input, parsed.success ? parsed.data : { hero: { title: "", subtitle: "" }, blocks: [] }), row.publishedAt);
}

export async function getPublicPartner(slug: string): Promise<PublicPartner | null> {
  if (!isDatabaseConfigured() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return null;
  try {
    if (await isPreviewingAlliance()) return await draftPartner(slug);
    return await partnerLoader(slug)();
  } catch (error) {
    log.error("alliance.partner_failed", { slug, error });
    return null;
  }
}

/** Slugs publicados (sitemap e geração estática). */
export async function getPublishedPartnerSlugs() {
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await getDb()
      .select({ slug: sql<string>`${schema.partners.publishedSnapshot} ->> 'slug'`, publishedAt: schema.partners.publishedAt })
      .from(schema.partners)
      .where(VISIBLE);
    return rows;
  } catch (error) {
    log.error("alliance.slugs_failed", { error });
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Programa: modalidades, níveis e percentuais públicos                        */
/* -------------------------------------------------------------------------- */

export type PublicProgram = { modalities: ModalityRow[]; tiers: (TierRow & { rateBp: number | null })[] };

const FALLBACK: PublicProgram = {
  modalities: MODALITY_KEYS.map((key) => ({ key, name: MODALITIES[key].name, description: MODALITIES[key].description, isActive: true, icon: MODALITIES[key].icon })),
  tiers: TIER_KEYS.map((key) => ({ key, ...TIERS[key], rateBp: null })),
};

const programLoader = unstable_cache(
  async (): Promise<PublicProgram> => {
    const today = new Date().toISOString().slice(0, 10);
    const [modalities, tiers, rules] = await Promise.all([
      listModalities(),
      listTiers(),
      // Só regras gerais por nível, aprovadas, vigentes e marcadas como públicas.
      getDb()
        .select({ tierKey: schema.commissionRules.tierKey, rateBp: schema.commissionRules.rateBp, validFrom: schema.commissionRules.validFrom })
        .from(schema.commissionRules)
        .where(
          and(
            eq(schema.commissionRules.status, "approved"),
            eq(schema.commissionRules.isPublic, true),
            isNull(schema.commissionRules.partnerId),
            isNull(schema.commissionRules.modalityKey),
            isNotNull(schema.commissionRules.tierKey),
            lte(schema.commissionRules.validFrom, today),
            or(isNull(schema.commissionRules.validTo), gte(schema.commissionRules.validTo, today)),
          ),
        )
        .orderBy(desc(schema.commissionRules.validFrom)),
    ]);
    const rateOf = (key: TierKey) => rules.find((r) => r.tierKey === key)?.rateBp ?? null;
    return { modalities: modalities.filter((m) => m.isActive), tiers: tiers.map((t) => ({ ...t, rateBp: rateOf(t.key) })) };
  },
  ["alliance-program"],
  // Revalida a cada hora também: uma regra com vigência futura passa a valer sem ninguém publicar nada.
  { tags: [ALLIANCE_TAGS.program], revalidate: 3600 },
);

export async function getPublicProgram(): Promise<PublicProgram> {
  if (!isDatabaseConfigured()) return FALLBACK;
  try {
    return await programLoader();
  } catch (error) {
    log.error("alliance.program_failed", { error });
    return FALLBACK;
  }
}
