import "server-only";
import { revalidateTag } from "next/cache";
import { log } from "@/server/log";

/**
 * Tags de cache do conteúdo público. O site lê do cache (unstable_cache) e cada publicação
 * invalida só as tags afetadas.
 *
 * `{ expire: 0 }`: quem publica espera ver a mudança no próximo carregamento, sem conteúdo antigo.
 */
export const CACHE_TAGS = {
  landing: "landing",
  projects: "projects",
  project: (slug: string) => `project:${slug}`,
  /** Tudo que exibe imagens resolvidas a partir da biblioteca de mídia. */
  media: "media",
  /** Listagens, busca, RSS e sitemap do Blog. */
  blog: "blog",
  blogArticle: (slug: string) => `blog:${slug}`,
} as const;

export function invalidate(...tags: string[]) {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (error) {
      // Fora de um contexto do Next (scripts e testes) não há cache para invalidar.
      log.debug("cache.invalidate_skipped", { tag, error: String(error) });
    }
  }
}
