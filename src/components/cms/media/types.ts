/** Mídia como chega ao navegador (datas serializadas). */
export type MediaDTO = {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  alt: string;
  filename: string;
  blurDataUrl: string | null;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
};

export type MediaUsageDTO = { resourceType: string; resourceId: string; field: string; label: string };

export type MediaDetailDTO = MediaDTO & { uploadedByName: string | null; usages: MediaUsageDTO[] };

export const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
export const MAX_BYTES = 10 * 1024 * 1024;

/** Checagem prévia no navegador, só para dar retorno imediato. O servidor valida de verdade. */
export function precheck(file: File): string | null {
  if (!ACCEPT.split(",").includes(file.type)) return "Formato não aceito. Envie JPG, PNG, WebP ou AVIF.";
  if (file.size > MAX_BYTES) return "A imagem pode ter no máximo 10 MB.";
  return null;
}

/** Link para editar o recurso onde a imagem é usada. */
export function usageHref(usage: MediaUsageDTO, sectionSlugs: Record<string, string>) {
  if (usage.resourceType === "section") {
    if (usage.resourceId === "site") return "/cms/configuracoes";
    const slug = sectionSlugs[usage.resourceId];
    return slug ? `/cms/landing/${slug}` : null;
  }
  if (usage.resourceType === "project") return `/cms/projetos/${usage.resourceId}`;
  return null;
}
