import type { BlogDocument, TocEntry } from "./document";
import type { ProjectImage } from "@/lib/projects/types";

/**
 * Versão publicada de um artigo, congelada na publicação (coluna published_snapshot).
 * Guarda referências (categoria, autor, mídia), não cópias: renomear uma categoria ou trocar a foto
 * de um autor vale na hora, sem republicar.
 */
export type BlogSnapshot = {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: BlogDocument;
  toc: TocEntry[];
  categoryId: string;
  authorId: string;
  coverMediaId: string;
  coverAlt: string;
  coverCaption: string;
  seoTitle: string;
  seoDescription: string;
  readingMinutes: number;
  words: number;
  /** Momento em que esta versão foi congelada. Alterações salvas depois disso ficam pendentes. */
  frozenAt: string;
  /** Preenchido quando um artigo já no ar recebe alterações publicadas ("Atualizado em"). */
  revisedAt: string | null;
};

export type PublicAuthor = {
  slug: string;
  name: string;
  roleTitle: string;
  bio: string;
  affiliation: "team" | "guest";
  photo: ProjectImage | null;
  links: { label: string; url: string }[];
};

export type PublicCategory = { slug: string; name: string; description: string };

/** Artigo pronto para as listagens do site. */
export type PublicArticleCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  featured: boolean;
  readingMinutes: number;
  publishedAt: string;
  updatedAt: string;
  cover: ProjectImage | null;
  category: PublicCategory;
  author: PublicAuthor;
};

/** Artigo completo para a página do artigo. */
export type PublicArticle = PublicArticleCard & {
  content: BlogDocument;
  toc: TocEntry[];
  coverCaption: string;
  seoTitle: string;
  seoDescription: string;
  firstPublishedAt: string;
  media: Record<string, { url: string; width: number; height: number; blurDataUrl: string | null }>;
  preview?: boolean;
};
