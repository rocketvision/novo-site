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
}[] = [
  { key: "hero", slug: "hero", label: "Hero", description: "Título, descrição, botões e foto de abertura.", area: "landing", path: "/" },
  { key: "problem", slug: "problema", label: "Problema", description: "Os improvisos que caem sobre a foto e a conclusão.", area: "landing", path: "/" },
  { key: "shift", slug: "o-que-muda", label: "O que muda", description: "Pares de antes e depois com as fotos de cada grupo.", area: "landing", path: "/" },
  { key: "statement", slug: "virada", label: "Virada", description: "A proposta da Rocket e a foto que sobe por trás.", area: "landing", path: "/" },
  { key: "services", slug: "servicos", label: "Serviços", description: "Cada serviço com problema, solução, resultados e foto.", area: "landing", path: "/#servicos" },
  { key: "differentials", slug: "diferenciais", label: "Diferenciais", description: "Os compromissos da Rocket e a foto da seção.", area: "landing", path: "/#diferenciais" },
  { key: "workflow", slug: "processo", label: "Processo", description: "As etapas de trabalho e a foto de cada uma.", area: "landing", path: "/#processo" },
  { key: "turn", slug: "momento-tipografico", label: "Momento tipográfico", description: "A frase que se desmonta e dá lugar à outra.", area: "landing", path: "/" },
  { key: "cta", slug: "contato", label: "Contato", description: "Convite final, formulário e foto.", area: "landing", path: "/#contato" },
  { key: "projectsPage", slug: "pagina-de-projetos", label: "Página de projetos", description: "Abertura e convite final da página de projetos.", area: "landing", path: "/projetos" },
  { key: "site", slug: "site", label: "Site", description: "SEO, contato, redes sociais e dados do rodapé.", area: "settings", path: "/" },
];

export const LANDING_SECTIONS = SECTIONS.filter((s) => s.area === "landing");

export function sectionBySlug(slug: string) {
  return SECTIONS.find((s) => s.slug === slug);
}

export function sectionByKey(key: SectionKey) {
  return SECTIONS.find((s) => s.key === key)!;
}
