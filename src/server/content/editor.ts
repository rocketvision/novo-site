import "server-only";
import type { SectionKey } from "@/lib/content/schemas";
import { getMediaByIds } from "@/server/media/service";
import { collectImageRefs } from "./refs";
import { getSectionState } from "./sections";

/** Dados que a página do editor precisa: estado da seção e as mídias já referenciadas no rascunho. */
export async function loadEditor(key: SectionKey) {
  const state = await getSectionState(key);
  const ids = collectImageRefs(state.draft).map((r) => r.mediaId);
  const media = await getMediaByIds(ids);
  return {
    initial: {
      draft: state.draft,
      version: state.version,
      hasChanges: state.hasChanges,
      isPublished: state.published !== null,
      publishedAt: state.publishedAt?.toISOString() ?? null,
      publishedByName: state.publishedByName,
      draftUpdatedAt: state.draftUpdatedAt?.toISOString() ?? null,
      draftUpdatedByName: state.draftUpdatedByName,
    },
    media: Object.fromEntries(
      [...media.values()].map((m) => [m.id, { id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height, filename: m.filename, blurDataUrl: m.blurDataUrl }]),
    ),
  };
}
