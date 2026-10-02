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

type Tile = { src: string; position: string };

/** Telas avulsas para o mosaico: projetos reais sem página inteira capturada e os projetos conceituais. */
const STILLS: Record<string, string> = {
  "boni-solar": "/projects/boni-conecta/galeria-1-solar.webp",
  "boni-solucoes": "/projects/boni-conecta/galeria-2-solucoes.webp",
  "boni-home": "/projects/boni-conecta/tela-desktop.webp",
  brasa: "/projects/concepts/brasa-burger/tela-desktop.webp",
  feira: "/projects/concepts/feira-viva/tela-desktop.webp",
  fluxo: "/projects/concepts/fluxo/tela-desktop.webp",
  navalha: "/projects/concepts/navalha-barbearia/tela-desktop.webp",
  pulso: "/projects/concepts/pulso/tela-desktop.webp",
  atlas: "/projects/concepts/atlas-imoveis/tela-desktop.webp",
  trilha: "/projects/concepts/trilha/tela-desktop.webp",
};

/** De qual projeto cada tela avulsa é: a do cliente só entra se ele estiver publicado. */
const STILL_PROJECT: Record<string, string> = { "boni-solar": "boni-conecta", "boni-solucoes": "boni-conecta", "boni-home": "boni-conecta" };

/**
 * A ordem do mosaico da cena de sites (4 colunas): cada tela aparece uma vez só, e as cores fortes
 * dos conceitos ficam nas linhas do meio, que aparecem dentro das letras de SITES na abertura da cena;
 * as páginas reais, mais claras, ficam nas bordas.
 * Itens "slug@posição" são recortes de uma página inteira; os outros, telas avulsas.
 */
const MOSAIC = [
  "mmv-assessoria@50% 0%", "gautica@50% 0%", "gautica-central-de-ajuda@50% 0%", "boni-home",
  "brasa", "fluxo", "navalha", "pulso",
  "feira", "mmv-assessoria@50% 55%", "trilha", "boni-solar",
  "atlas", "gautica-cadastro@50% 0%", "boni-solucoes", "gautica@50% 100%",
];

/** Telas de projetos para o mosaico da cena de sites: reais publicados e conceituais, sem repetir. */
export function siteTiles(slugs: string[]): Tile[] {
  const published = new Set(slugs);
  return MOSAIC.flatMap((item) => {
    const [key, position] = item.split("@");
    if (position) {
      const strips = published.has(key) ? stripsOf(key) : null;
      return strips ? [{ src: strips.desktop.src, position }] : [];
    }
    const owner = STILL_PROJECT[key];
    if (owner && !published.has(owner)) return [];
    return [{ src: STILLS[key], position: "50% 0%" }];
  });
}
