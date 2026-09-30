import "server-only";

/** Código e constraint de um erro do Postgres, esteja ele direto ou embrulhado pelo Drizzle (`cause`). */
export function pgError(error: unknown): { code?: string; constraint?: string } {
  const e = error as { code?: string; constraint?: string; cause?: unknown };
  if (e?.code) return e;
  const cause = e?.cause as { code?: string; constraint?: string } | undefined;
  return cause?.code ? cause : {};
}
