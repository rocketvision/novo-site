import type { PublicArticleCard } from "./types";

const long = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

/** "12 de março de 2026". */
export const formatArticleDate = (iso: string) => long.format(new Date(iso));

/** Houve alteração publicada depois da primeira publicação (mais de um dia)? */
export function wasUpdated(article: Pick<PublicArticleCard, "publishedAt" | "updatedAt">) {
  return new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() > 24 * 3600 * 1000;
}

/** Atribuição do autor: colunista externo nunca é apresentado como equipe. */
export function authorLabel(author: PublicArticleCard["author"]) {
  if (author.affiliation === "guest") return author.roleTitle ? `Colunista convidado · ${author.roleTitle}` : "Colunista convidado";
  return author.roleTitle || "Rocket Vision";
}
