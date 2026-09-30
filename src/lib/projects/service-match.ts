import type { PublicProject } from "./types";

/** Só projetos reais: os de exemplo (fictícios) nunca aparecem na landing. */
export function realProjects(projects: PublicProject[]) {
  return projects.filter((p) => !p.sample);
}
