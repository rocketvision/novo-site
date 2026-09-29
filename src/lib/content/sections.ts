import type { SectionKey } from "./schemas";

/**
 * Seções editáveis, na ordem em que aparecem no site.
 * `slug` forma a URL no CMS (/cms/landing/[slug]); `area` define as permissões exigidas.
 */
export const SECTIONS: {
  key: SectionKey;
  slug: string;
  label: string;
  description: string;
  area: "landing" | "settings";
  /** Onde a seção aparece no site, para o preview. */
  path: string;
  /**
   * Saiu da landing (versão enxuta). Some do CMS, mas o conteúdo continua salvo no banco
   * e volta a ser editável se a seção voltar ao site.
   */
  retired?: boolean;
}[] = [
  { key: "hero", slug: "hero", label: "Hero", description: "Título, descrição e botões sobre o vídeo de abertura.", area: "landing", path: "/" },
  { key: "problem", slug: "problema", label: "Problema", description: "Os improvisos que aparecem nas ilustrações dos serviços.", area: "landing", path: "/" },
  { key: "shift", slug: "o-que-muda", label: "O que muda", description: "Pares de antes e depois, em cartões que passam na horizontal.", area: "landing", path: "/", retired: true },
  { key: "statement", slug: "virada", label: "Virada", description: "A proposta da Rocket e os improvisos se encaixando.", area: "landing", path: "/", retired: true },
  { key: "services", slug: "servicos", label: "Serviços", description: "Cada serviço com problema, solução e resultados.", area: "landing", path: "/#servicos" },
  { key: "differentials", slug: "diferenciais", label: "Diferenciais", description: "Os compromissos da Rocket, um capítulo por vez.", area: "landing", path: "/#diferenciais", retired: true },
  { key: "workflow", slug: "processo", label: "Processo", description: "As etapas do caminho que o foguete percorre.", area: "landing", path: "/#processo" },
  { key: "turn", slug: "momento-tipografico", label: "Momento tipográfico", description: "A frase que se desmonta e dá lugar à outra.", area: "landing", path: "/", retired: true },
  { key: "cta", slug: "contato", label: "Contato", description: "Convite final sobre o vídeo e o formulário.", area: "landing", path: "/#contato" },
  { key: "projectsPage", slug: "pagina-de-projetos", label: "Página de projetos", description: "Abertura e convite final da página de projetos.", area: "landing", path: "/projetos" },
  { key: "site", slug: "site", label: "Site", description: "SEO, contato, redes sociais e dados do rodapé.", area: "settings", path: "/" },
];

export const LANDING_SECTIONS = SECTIONS.filter((s) => s.area === "landing" && !s.retired);

export function sectionBySlug(slug: string) {
  return SECTIONS.find((s) => s.slug === slug && !s.retired);
}

export function sectionByKey(key: SectionKey) {
  return SECTIONS.find((s) => s.key === key)!;
}
