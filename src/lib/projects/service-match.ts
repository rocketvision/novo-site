import type { PublicProject } from "./types";

/**
 * Liga os projetos reais aos serviços da landing pela categoria cadastrada no CMS.
 * Um projeto novo de loja, por exemplo, passa a ilustrar Lojas virtuais sem mexer no código.
 *
 * A ordem importa: "Aplicativo de delivery" é aplicativo, não site; "Loja virtual" é loja.
 */
const RULES: [RegExp, string][] = [
  [/\bloja|e-?commerce/, "lojas"],
  [/aplicativo|\bapps?\b/, "aplicativos"],
  [/identidade|\bmarca\b|branding/, "identidade"],
  [/landing|\bsite|blog|portfolio|institucional/, "sites"],
  [/sistema|central de ajuda|cadastro|\bcrm\b|painel|plataforma|dashboard|gestao/, "sistemas"],
];

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

/** Identificador do serviço (o `id` em Serviços) que a categoria representa, ou null. */
export function serviceOfCategory(category: string): string | null {
  const value = normalize(category);
  return RULES.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

/** Só projetos reais: os de exemplo (fictícios) nunca aparecem na landing. */
export function realProjects(projects: PublicProject[]) {
  return projects.filter((p) => !p.sample);
}

/** Projetos reais agrupados pelo serviço que ilustram, na ordem do CMS. */
export function projectsByService(projects: PublicProject[]) {
  const groups: Record<string, PublicProject[]> = {};
  for (const project of realProjects(projects)) {
    const service = serviceOfCategory(project.category);
    if (service) (groups[service] ??= []).push(project);
  }
  return groups;
}
