import { z } from "zod";
import { contrastRatio } from "@/lib/projects/color";

export { contrastRatio };
import { optionalHttpsUrl, optionalText, text } from "@/lib/content/schemas";

/**
 * Dados editáveis de um projeto, compartilhados entre o formulário e a API.
 * Status, ordem, autoria e datas de publicação não entram aqui: mudam só por ações próprias.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const hex = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, "Use uma cor no formato #1a2b3c.");

const mediaRef = z.string().uuid("Imagem inválida.").nullable();

export const PROJECT_LIMITS = { phones: 2, gallery: 12, services: 8, highlights: 6 } as const;

export const projectInputSchema = z.object({
  name: text(80, "O nome"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "O endereço precisa de pelo menos 2 caracteres.")
    .max(60, "O endereço pode ter até 60 caracteres.")
    .regex(SLUG_PATTERN, "Use só letras minúsculas, números e hífens entre palavras."),
  client: optionalText(80, "O cliente"),
  category: text(40, "A categoria"),
  projectDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")]),
  summary: text(220, "O resumo"),
  description: optionalText(2000, "A descrição"),
  context: optionalText(1500, "O contexto"),
  solution: optionalText(1500, "A solução"),
  results: optionalText(1500, "Os resultados"),
  services: z.array(text(40, "Cada serviço")).max(PROJECT_LIMITS.services, `Use até ${PROJECT_LIMITS.services} serviços.`),
  highlights: z.array(text(90, "Cada destaque")).max(PROJECT_LIMITS.highlights, `Use até ${PROJECT_LIMITS.highlights} destaques.`),
  brandColor: hex,
  accentColor: hex,
  tone: z.enum(["light", "dark"]),
  coverMediaId: mediaRef,
  logoMediaId: mediaRef,
  ogMediaId: mediaRef,
  desktopMediaId: mediaRef,
  phoneMediaIds: z.array(z.string().uuid()).max(PROJECT_LIMITS.phones, `Use até ${PROJECT_LIMITS.phones} telas de celular.`),
  gallery: z
    .array(z.object({ mediaId: z.string().uuid(), caption: optionalText(160, "A legenda") }))
    .max(PROJECT_LIMITS.gallery, `Use até ${PROJECT_LIMITS.gallery} imagens na galeria.`),
  externalUrl: optionalHttpsUrl,
  seoTitle: optionalText(70, "O título para buscadores"),
  seoDescription: optionalText(170, "A descrição para buscadores"),
  featured: z.boolean(),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const createProjectSchema = z.object({ data: projectInputSchema });
export const updateProjectSchema = z.object({ version: z.number().int().min(1), data: projectInputSchema });
export const projectVersionSchema = z.object({ version: z.number().int().min(1) });
export const reorderProjectsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });
export const deleteProjectSchema = z.object({ version: z.number().int().min(1), confirmSlug: z.string().max(60) });

export const projectListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

/** "Clínica Vitta" vira "clinica-vitta". */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}


/** Texto claro ou escuro sobre a cor: o que tiver mais contraste. */
export function suggestTone(brandColor: string): "light" | "dark" {
  return contrastRatio(brandColor, "#ffffff") >= contrastRatio(brandColor, "#0a0a0b") ? "light" : "dark";
}
