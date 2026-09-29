/**
 * Schemas do conteúdo editável da landing e das configurações do site.
 *
 * Compartilhados entre o formulário do CMS (validação imediata) e o servidor
 * (validação definitiva antes de gravar). Cada schema reflete o que o componente
 * da landing realmente renderiza, para o CMS não oferecer campos sem efeito.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Primitivas                                                                   */
/* -------------------------------------------------------------------------- */

export const text = (max: number, label = "Este campo") =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório.`)
    .max(max, `${label} pode ter até ${max} caracteres.`)
    .refine((v) => !/[\u2013\u2014]/.test(v), "Use ponto, vírgula ou dois-pontos no lugar do travessão.");

export const optionalText = (max: number, label = "Este campo") =>
  z
    .string()
    .trim()
    .max(max, `${label} pode ter até ${max} caracteres.`)
    .refine((v) => !/[\u2013\u2014]/.test(v), "Use ponto, vírgula ou dois-pontos no lugar do travessão.");

/**
 * Link seguro: caminho interno (/...), âncora (#...), https, mailto ou tel.
 * Bloqueia javascript:, data:, protocol-relative (//) e http sem TLS.
 */
export const href = z
  .string()
  .trim()
  .min(1, "Informe o link.")
  .max(500, "O link pode ter até 500 caracteres.")
  .refine((value) => {
    if (/^\/(?!\/)/.test(value) || /^#[\w-]+$/.test(value)) return true;
    try {
      const url = new URL(value);
      return ["https:", "mailto:", "tel:"].includes(url.protocol);
    } catch {
      return false;
    }
  }, "Use um caminho do site (/projetos), uma âncora (#contato) ou um endereço https.");

export const optionalHttpsUrl = z
  .string()
  .trim()
  .max(500, "O link pode ter até 500 caracteres.")
  .refine((value) => {
    if (value === "") return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Informe um endereço completo começando com https://.");

export const uuid = z.string().uuid("Identificador inválido.");

/**
 * Imagem da biblioteca de mídia (`mediaId`) com texto alternativo.
 * A landing não usa fotografia hoje: as seções são composições em código e o vídeo de abertura.
 * O campo fica disponível para quando houver fotos reais de clientes e projetos.
 * Conteúdo salvo com fotos antigas continua válido: os campos que as seções não usam mais são descartados.
 */
export const image = z.object({
  mediaId: uuid.nullable(),
  alt: optionalText(200, "O texto alternativo"),
});
export type ImageField = z.infer<typeof image>;

const link = z.object({ label: text(40, "O texto do botão"), href });

/* -------------------------------------------------------------------------- */
/* Seções                                                                       */
/* -------------------------------------------------------------------------- */

export const heroSchema = z.object({
  // O rótulo acima do título é a assinatura institucional (nome + slogan), fixa no código.
  // A foto antiga, a garantia e os cartões de vidro salvos no banco são descartados: a abertura é só o vídeo e a promessa.
  titleLines: z.array(text(40, "Cada linha do título")).min(1).max(4, "Use até 4 linhas."),
  lead: text(260, "A descrição"),
  primaryCta: link,
  secondaryCta: link,
});

export const problemSchema = z.object({
  eyebrow: text(60, "O rótulo"),
  symptoms: z
    .array(
      z.object({
        kind: z.enum(["file", "chat", "search", "note"]),
        text: text(70, "A legenda"),
        artifact: text(60, "O texto do objeto"),
        meta: optionalText(40, "O complemento"),
      }),
    )
    .length(4),
  conclusion: z.tuple([text(60, "A primeira frase"), text(60, "A segunda frase")]),
});

export const shiftSchema = z.object({
  eyebrow: text(40, "O rótulo"),
  title: text(140, "O título"),
  groups: z
    .array(
      z.object({
        pairs: z
          .array(z.object({ before: text(70, "O antes"), after: text(110, "O depois") }))
          .length(2, "Cada grupo tem duas transformações."),
      }),
    )
    .min(1)
    .max(4, "Use até 4 grupos."),
});

export const statementSchema = z.object({
  title: text(160, "O título"),
  body: text(320, "O texto"),
});

export const serviceItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/, "Identificador inválido."),
  name: text(40, "O nome"),
  title: text(80, "O título"),
  problem: text(220, "O problema"),
  what: text(240, "O que fazemos"),
  outcomes: z.array(text(80, "Cada resultado")).min(1).max(4, "Use até 4 resultados."),
  signal: text(50, "O sinal de resultado"),
});

export const servicesSchema = z.object({
  eyebrow: text(40, "O rótulo"),
  title: text(80, "O título"),
  lead: text(200, "A descrição"),
  items: z
    .array(serviceItemSchema)
    .min(1)
    .max(8, "Use até 8 serviços.")
    .refine((items) => new Set(items.map((i) => i.id)).size === items.length, "Cada serviço precisa de um identificador único."),
});

export const differentialsSchema = z.object({
  eyebrow: text(40, "O rótulo"),
  title: text(120, "O título"),
  items: z
    .array(z.object({ title: text(60, "O título"), body: text(220, "O texto") }))
    .min(1)
    .max(8, "Use até 8 diferenciais."),
});

export const workflowSchema = z.object({
  eyebrow: text(40, "O rótulo"),
  title: text(100, "O título"),
  lead: text(220, "A descrição"),
  steps: z
    .array(
      z.object({
        name: text(24, "O nome da etapa"),
        title: text(80, "O título"),
        body: text(220, "O texto"),
      }),
    )
    .min(2)
    .max(6, "Use até 6 etapas."),
});

export const turnSchema = z
  .object({
    from: text(90, "A primeira frase"),
    strike: text(30, "A palavra riscada"),
    to: text(60, "A segunda frase"),
  })
  .refine((v) => v.from.split(/\s+/).some((w) => w.replace(/[.,!?;:]+$/, "") === v.strike.trim()), {
    path: ["strike"],
    message: "A palavra riscada precisa aparecer na primeira frase.",
  });

export const ctaSchema = z.object({
  eyebrow: text(40, "O rótulo"),
  titleLines: z.array(text(40, "Cada linha do título")).min(1).max(3, "Use até 3 linhas."),
  lead: text(260, "A descrição"),
  submit: text(40, "O texto do botão"),
  interests: z.array(text(30, "Cada opção")).min(1).max(10, "Use até 10 opções."),
  reassurance: optionalText(80, "O texto de apoio"),
});

export const projectsPageSchema = z.object({
  eyebrow: text(30, "O rótulo"),
  title: text(80, "O título"),
  lead: text(240, "A descrição"),
  cta: z.object({
    title: text(80, "O título"),
    body: text(200, "O texto"),
    label: text(40, "O texto do botão"),
  }),
});

export const siteSchema = z.object({
  seo: z.object({
    title: text(70, "O título"),
    description: text(170, "A descrição"),
  }),
  footerTagline: text(140, "O texto do rodapé"),
  contact: z.object({
    email: z.union([z.literal(""), z.string().trim().email("Informe um e-mail válido.").max(120)]),
    phone: optionalText(30, "O telefone"),
    whatsapp: z
      .string()
      .trim()
      .regex(/^(\d{10,15})?$/, "Use só números com DDI e DDD. Ex.: 5514999999999"),
  }),
  social: z
    .array(z.object({ label: text(30, "O nome da rede"), href: optionalHttpsUrl.refine((v) => v !== "", "Informe o link.") }))
    .max(8),
  legal: z.object({
    companyName: optionalText(120, "A razão social"),
    cnpj: z
      .string()
      .trim()
      .regex(/^(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})?$/, "CNPJ inválido."),
  }),
});

export const SECTION_SCHEMAS = {
  hero: heroSchema,
  problem: problemSchema,
  shift: shiftSchema,
  statement: statementSchema,
  services: servicesSchema,
  differentials: differentialsSchema,
  workflow: workflowSchema,
  turn: turnSchema,
  cta: ctaSchema,
  projectsPage: projectsPageSchema,
  site: siteSchema,
} as const;

export type SectionKey = keyof typeof SECTION_SCHEMAS;
export type SectionContent<K extends SectionKey> = z.infer<(typeof SECTION_SCHEMAS)[K]>;
export type SiteContent = SectionContent<"site">;

export const SECTION_KEYS = Object.keys(SECTION_SCHEMAS) as SectionKey[];

export function isSectionKey(value: string): value is SectionKey {
  return Object.hasOwn(SECTION_SCHEMAS, value);
}
