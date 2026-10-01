import type { PartnerPageContent } from "./page-blocks";

/**
 * Versão publicada de um parceiro, congelada ao publicar. O site lê só isto: editar o cadastro
 * não muda o diretório nem a página exclusiva até publicar de novo. Não contém dados internos
 * (razão social, CNPJ, contatos, contratos, comissões, avaliações).
 */
export type PartnerSnapshot = {
  slug: string;
  tradeName: string;
  sector: string;
  shortDescription: string;
  description: string;
  specialties: string[];
  services: string[];
  websiteUrl: string;
  socialLinks: { label: string; url: string }[];
  location: string;
  logoMediaId: string | null;
  logoAltMediaId: string | null;
  coverMediaId: string | null;
  ogMediaId: string | null;
  accentColor: string;
  modalities: string[];
  /** Só quando a exibição do nível foi autorizada. */
  tierKey: string | null;
  testimonials: { quote: string; author: string; role: string }[];
  gallery: { mediaId: string; caption: string }[];
  projectIds: string[];
  seoTitle: string;
  seoDescription: string;
  page: PartnerPageContent;
};

export type PublicImage = { src: string; alt: string; width: number; height: number; blurDataURL?: string };

/** Parceiro pronto para o site: imagens resolvidas e projetos conjuntos já publicados. */
export type PublicPartner = Omit<PartnerSnapshot, "logoMediaId" | "logoAltMediaId" | "coverMediaId" | "ogMediaId" | "gallery" | "projectIds"> & {
  id: string;
  featured: boolean;
  logo: PublicImage | null;
  logoAlt: PublicImage | null;
  cover: PublicImage | null;
  og: PublicImage | null;
  gallery: (PublicImage & { caption: string })[];
  projects: { slug: string; name: string; category: string; summary: string; cover: PublicImage | null }[];
  publishedAt: string | null;
};

/** Cartão do diretório: só o necessário para listar e filtrar. */
export type DirectoryCard = Pick<PublicPartner, "id" | "slug" | "tradeName" | "sector" | "shortDescription" | "location" | "modalities" | "tierKey" | "logo" | "logoAlt" | "cover" | "featured" | "accentColor">;
