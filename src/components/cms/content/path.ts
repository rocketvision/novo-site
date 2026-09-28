/** Leitura e escrita imutável por caminho ("items.2.title") no conteúdo do formulário. */

export type Path = (string | number)[];

export const pathKey = (path: Path) => path.join(".");

export function getAt(value: unknown, path: Path): unknown {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

export function setAt<T>(root: T, path: Path, next: unknown): T {
  if (path.length === 0) return next as T;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const copy = [...root];
    copy[head as number] = setAt(copy[head as number], rest, next);
    return copy as T;
  }
  const obj = (root ?? {}) as Record<string, unknown>;
  return { ...obj, [head]: setAt(obj[head as string], rest, next) } as T;
}

/** Erros do servidor ou do schema chegam por caminho; este filtro pega os de um campo e dos filhos. */
export function errorsUnder(errors: Record<string, string>, path: Path) {
  const prefix = pathKey(path);
  return Object.keys(errors).filter((k) => k === prefix || k.startsWith(`${prefix}.`));
}
