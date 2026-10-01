import { z } from "zod";
import { optionalHttpsUrl, optionalText } from "@/lib/content/schemas";

/**
 * Página exclusiva de cada parceiro (/partners/[slug]): um cabeçalho e uma lista de blocos, na ordem
 * escolhida no CMS. Nada aqui é inventado: blocos sem conteúdo não aparecem no site. Os blocos
 * "expertise", "projects", "gallery" e "testimonials" usam os dados do cadastro do parceiro.
 */

const id = z.string().regex(/^[a-z0-9-]{4,40}$/, "Identificador de bloco inválido.");
const visible = z.boolean();

export const textBlock = z.object({
  id,
  kind: z.literal("text"),
  visible,
  eyebrow: optionalText(60, "O rótulo"),
  title: optionalText(120, "O título"),
  /** Parágrafos separados por uma linha em branco. */
  body: optionalText(4000, "O texto"),
});

export const expertiseBlock = z.object({ id, kind: z.literal("expertise"), visible, eyebrow: optionalText(60, "O rótulo"), title: optionalText(120, "O título") });
export const projectsBlock = z.object({ id, kind: z.literal("projects"), visible, eyebrow: optionalText(60, "O rótulo"), title: optionalText(120, "O título") });
export const galleryBlock = z.object({ id, kind: z.literal("gallery"), visible, eyebrow: optionalText(60, "O rótulo"), title: optionalText(120, "O título") });
export const testimonialsBlock = z.object({ id, kind: z.literal("testimonials"), visible, eyebrow: optionalText(60, "O rótulo"), title: optionalText(120, "O título") });

export const ctaBlock = z.object({
  id,
  kind: z.literal("cta"),
  visible,
  title: optionalText(120, "O título"),
  body: optionalText(400, "O texto"),
  /** Vazio: "Visitar o site da {nome}". */
  label: optionalText(40, "O texto do botão"),
  /** Vazio: o site oficial cadastrado. */
  url: optionalHttpsUrl,
});

export const exploreBlock = z.object({ id, kind: z.literal("explore"), visible, title: optionalText(120, "O título") });

export const pageBlock = z.discriminatedUnion("kind", [textBlock, expertiseBlock, projectsBlock, galleryBlock, testimonialsBlock, ctaBlock, exploreBlock]);
export type PageBlock = z.infer<typeof pageBlock>;
export type BlockKind = PageBlock["kind"];

export const partnerPageSchema = z.object({
  hero: z.object({
    /** Frase de abertura. Ex.: "Duas visões. Um futuro em comum." */
    title: optionalText(90, "O título"),
    subtitle: optionalText(400, "O subtítulo"),
  }),
  blocks: z.array(pageBlock).max(20, "Use até 20 blocos."),
});
export type PartnerPageContent = z.infer<typeof partnerPageSchema>;

export const BLOCK_KINDS: { kind: BlockKind; label: string; description: string }[] = [
  { kind: "text", label: "Texto", description: "Rótulo, título e parágrafos." },
  { kind: "expertise", label: "Especialidades", description: "Usa as especialidades e os serviços do cadastro." },
  { kind: "projects", label: "Projetos", description: "Projetos conjuntos escolhidos no cadastro." },
  { kind: "gallery", label: "Galeria", description: "Imagens da galeria do parceiro." },
  { kind: "testimonials", label: "Depoimentos", description: "Só os depoimentos marcados como aprovados." },
  { kind: "cta", label: "Chamada", description: "Botão para o site oficial do parceiro." },
  { kind: "explore", label: "Explore mais", description: "Outros parceiros publicados." },
];

export const blockLabel = (kind: string) => BLOCK_KINDS.find((b) => b.kind === kind)?.label ?? kind;

let counter = 0;
export function newBlockId() {
  counter = (counter + 1) % 1000;
  return `b${Date.now().toString(36)}${counter.toString(36)}`.slice(0, 40);
}

export function newBlock(kind: BlockKind): PageBlock {
  const base = { id: newBlockId(), visible: true };
  switch (kind) {
    case "text":
      return { ...base, kind, eyebrow: "", title: "", body: "" };
    case "cta":
      return { ...base, kind, title: "", body: "", label: "", url: "" };
    case "explore":
      return { ...base, kind, title: "Conheça outros parceiros" };
    default:
      return { ...base, kind, eyebrow: "", title: "" };
  }
}

/**
 * Estrutura inicial de toda página nova, na ordem da proposta aprovada. Os títulos das seções vêm
 * prontos; os textos sobre o parceiro ficam vazios até a empresa fornecer ou aprovar o conteúdo.
 */
export function defaultPartnerPage(): PartnerPageContent {
  const t = (idSuffix: string, title: string) => ({ id: `default-${idSuffix}`, kind: "text" as const, visible: true, eyebrow: "", title, body: "" });
  return {
    hero: { title: "Duas visões. Um futuro em comum.", subtitle: "" },
    blocks: [
      t("about", "Sobre o parceiro"),
      t("what", "O que fazem"),
      { id: "default-expertise", kind: "expertise", visible: true, eyebrow: "", title: "Áreas de atuação" },
      t("partnership", "Nossa parceria"),
      { id: "default-projects", kind: "projects", visible: true, eyebrow: "", title: "Projetos em destaque" },
      { id: "default-cta", kind: "cta", visible: true, title: "", body: "", label: "", url: "" },
      { id: "default-explore", kind: "explore", visible: true, title: "Conheça outros parceiros" },
    ],
  };
}
