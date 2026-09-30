/**
 * Páginas inteiras dos projetos no ar, capturadas de cima a baixo (desktop a 1440 px e celular a
 * 390 px), para rolarem dentro do notebook e do celular na seção de projetos da home.
 * Arquivos em /public/projects/strips/{slug}-{desktop|mobile}.webp, pelo slug do projeto no CMS.
 */
export type Strip = { src: string; width: number; height: number };

const SIZES: Record<string, { desktop: [number, number]; mobile: [number, number] }> = {
  "mmv-assessoria": { desktop: [1200, 5500], mobile: [480, 12298] },
  gautica: { desktop: [1200, 1670], mobile: [480, 5897] },
  "gautica-central-de-ajuda": { desktop: [1200, 750], mobile: [480, 1039] },
  "gautica-cadastro": { desktop: [1200, 750], mobile: [480, 1039] },
};

export function stripsOf(slug: string): { desktop: Strip; mobile: Strip } | null {
  const sizes = SIZES[slug];
  if (!sizes) return null;
  const strip = (kind: "desktop" | "mobile"): Strip => ({
    src: `/projects/strips/${slug}-${kind}.webp`,
    width: sizes[kind][0],
    height: sizes[kind][1],
  });
  return { desktop: strip("desktop"), mobile: strip("mobile") };
}
