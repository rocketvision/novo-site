import { z } from "zod";
import { optionalText, text } from "@/lib/content/schemas";
import { parseDocument, type BlogDocument } from "@/lib/blog/document";
import { BLOG_ACTIONS } from "@/lib/blog/workflow";
import { SLUG_PATTERN } from "./projects";

/**
 * Dados do Blog compartilhados entre o Studio e a API.
 * Estado, autoria de criação e datas de publicação não entram aqui: mudam só pelas ações do fluxo.
 */

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "O endereço precisa de pelo menos 2 caracteres.")
  .max(90, "O endereço pode ter até 90 caracteres.")
  .regex(SLUG_PATTERN, "Use só letras minúsculas, números e hífens entre palavras.");

const mediaRef = z.string().uuid("Imagem inválida.").nullable();

/** O documento do editor: validado e reconstruído por parseDocument (lista fechada de nós). */
export const documentSchema = z.unknown().transform((value, ctx): BlogDocument => {
  const result = parseDocument(value);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.error });
    return z.NEVER;
  }
  return result.document;
});

export const articleInputSchema = z.object({
  title: text(140, "O título"),
  slug,
  subtitle: optionalText(220, "O subtítulo"),
  excerpt: optionalText(320, "O resumo"),
  content: documentSchema,
  categoryId: z.string().uuid("Categoria inválida.").nullable(),
  authorId: z.string().uuid("Autor inválido.").nullable(),
  coverMediaId: mediaRef,
  coverAlt: optionalText(300, "O texto alternativo da capa"),
  coverCaption: optionalText(300, "A legenda da capa"),
  seoTitle: optionalText(70, "O título para buscadores"),
  seoDescription: optionalText(170, "A descrição para buscadores"),
  featured: z.boolean(),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;

export const createArticleSchema = z.object({ data: articleInputSchema });
export const updateArticleSchema = z.object({ version: z.number().int().min(1), data: articleInputSchema });

export const articleActionSchema = z.object({
  action: z.enum(BLOG_ACTIONS as [string, ...string[]]),
  version: z.number().int().min(1),
  comment: optionalText(2000, "O comentário").optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
});

export const deleteArticleSchema = z.object({ version: z.number().int().min(1), confirmSlug: z.string().max(90) });
export const restoreRevisionSchema = z.object({ version: z.number().int().min(1) });
export const commentSchema = z.object({ body: text(2000, "O comentário") });

export const articleListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["draft", "in_review", "approved", "scheduled", "published", "archived"]).optional(),
  categoria: z.string().uuid().optional(),
  autor: z.string().uuid().optional(),
  aba: z.enum(["meus", "revisao", "todos"]).optional(),
});

const link = z.object({
  label: text(40, "O nome do link"),
  url: z
    .string()
    .trim()
    .max(300, "O link pode ter até 300 caracteres.")
    .refine((v) => {
      try {
        return new URL(v).protocol === "https:";
      } catch {
        return false;
      }
    }, "Use um endereço completo começando com https://."),
});

/** Perfil público do autor que o próprio autor pode editar. */
export const ownAuthorProfileSchema = z.object({
  name: text(80, "O nome"),
  roleTitle: optionalText(80, "O cargo ou especialidade"),
  bio: optionalText(600, "A bio"),
  photoMediaId: mediaRef,
  links: z.array(link).max(5, "Use até 5 links."),
});

export const authorInputSchema = ownAuthorProfileSchema.extend({
  slug: slug,
  affiliation: z.enum(["team", "guest"]),
  userId: z.string().uuid().nullable(),
  isActive: z.boolean(),
});

export type OwnAuthorProfile = z.infer<typeof ownAuthorProfileSchema>;
export type AuthorInput = z.infer<typeof authorInputSchema>;

export const categoryInputSchema = z.object({
  name: text(40, "O nome"),
  slug,
  description: optionalText(200, "A descrição"),
  sortOrder: z.number().int().min(0).max(1000),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const versioned = <S extends z.ZodType>(data: S) => z.object({ version: z.number().int().min(1), data });

export const blogSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
});
