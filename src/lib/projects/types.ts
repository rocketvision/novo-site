import type { StaticImageData } from "next/image";

/**
 * Versão publicada de um projeto, congelada no momento da publicação (coluna published_snapshot).
 * Guarda referências às mídias (não URLs): se o arquivo de uma mídia for substituído na biblioteca,
 * o site passa a mostrar o arquivo novo sem precisar republicar.
 */
export type ProjectSnapshot = {
  slug: string;
  name: string;
  client: string;
  category: string;
  projectDate: string;
  summary: string;
  description: string;
  context: string;
  solution: string;
  results: string;
  services: string[];
  highlights: string[];
  theme: { bg: string; accent: string; tone: "light" | "dark" };
  coverMediaId: string | null;
  logoMediaId: string | null;
  ogMediaId: string | null;
  desktopMediaId: string | null;
  phoneMediaIds: string[];
  gallery: { mediaId: string; caption: string }[];
  externalUrl: string;
  seoTitle: string;
  seoDescription: string;
  sample: boolean;
};

export type ProjectImage = {
  src: string | StaticImageData;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
};

/** Projeto pronto para o site: mídias resolvidas em imagens. */
export type PublicProject = Omit<ProjectSnapshot, "coverMediaId" | "logoMediaId" | "ogMediaId" | "desktopMediaId" | "phoneMediaIds" | "gallery"> & {
  id: string;
  year: string;
  featured: boolean;
  cover: ProjectImage | null;
  logo: ProjectImage | null;
  og: ProjectImage | null;
  screens: { desktop: ProjectImage | null; phones: ProjectImage[] };
  gallery: (ProjectImage & { caption: string })[];
};
