import type { MediaRef } from "@/server/media/service";

/** Um campo de imagem no conteúdo: objeto com `mediaId` e `alt`. */
export function isImageField(value: unknown): value is { mediaId: string | null; alt: string } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "mediaId" in value && "alt" in value;
}

const SEGMENT_LABELS: Record<string, string> = {
  image: "Imagem",
  groups: "Grupo",
  items: "Item",
  steps: "Etapa",
  cover: "Capa",
  logo: "Logo",
  og: "Imagem de compartilhamento",
};

/** "groups.1.image" vira "Grupo 2 · Imagem". */
export function humanizePath(path: string[]) {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    const next = path[i + 1];
    if (next !== undefined && /^\d+$/.test(next)) {
      parts.push(`${SEGMENT_LABELS[segment] ?? segment} ${Number(next) + 1}`);
      i++;
    } else {
      parts.push(SEGMENT_LABELS[segment] ?? segment);
    }
  }
  return parts.join(" · ");
}

/** Percorre o conteúdo e devolve cada imagem da biblioteca usada, com o caminho do campo. */
export function collectImageRefs(value: unknown, path: string[] = []): { mediaId: string; path: string[] }[] {
  if (isImageField(value)) return value.mediaId ? [{ mediaId: value.mediaId, path }] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => collectImageRefs(v, [...path, String(i)]));
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([k, v]) => collectImageRefs(v, [...path, k]));
  }
  return [];
}

/** Usos de mídia de uma seção, separando rascunho e publicado (uma imagem pode estar só em um deles). */
export function sectionMediaRefs(label: string, draft: unknown, published: unknown): MediaRef[] {
  const refs = (content: unknown, state: "draft" | "published", stateLabel: string) =>
    collectImageRefs(content).map((r) => ({
      mediaId: r.mediaId,
      field: `${state}:${r.path.join(".")}`,
      label: `${label} · ${humanizePath(r.path)} (${stateLabel})`,
    }));
  return [...refs(draft, "draft", "rascunho"), ...refs(published, "published", "publicado")];
}
