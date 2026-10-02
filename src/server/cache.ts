import "server-only";
import { revalidateTag } from "next/cache";
import { log } from "@/server/log";

/**
 * Tags de cache do conteúdo público. O site lê do cache (unstable_cache) e cada publicação
 * invalida só as tags afetadas.
 *
 * `{ expire: 0 }`: quem publica espera ver a mudança no próximo carregamento, sem conteúdo antigo.
 */
/**
 * Validade máxima do conteúdo em cache (segundos). As tags continuam atualizando na hora ao publicar;
 * isto só garante que algo gravado fora do CMS (ex.: direto no banco) apareça em até 1 hora, já que o
 * cache de dados da Vercel sobrevive aos deploys.
 */
export const CACHE_MAX_AGE = 3600;

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
