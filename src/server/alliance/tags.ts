/** Tags de cache das páginas públicas do Rocket Alliance. */
export const ALLIANCE_TAGS = {
  /** Modalidades, níveis e regras públicas de comissão. */
  program: "alliance:program",
  /** Diretório: lista de parceiros publicados. */
  directory: "alliance:directory",
  partner: (slug: string) => `alliance:partner:${slug}`,
} as const;
