import { z } from "zod";
import { optionalHttpsUrl, optionalText, text } from "@/lib/content/schemas";
import { isValidPhone, phoneDigits } from "@/lib/diagnostic";
import {
  APPLICATION_STATUS_KEYS,
  CONTRACT_KINDS,
  CONTRACT_STATUSES,
  MODALITY_KEYS,
  OPPORTUNITY_KINDS,
  OPPORTUNITY_STATUSES,
  PARTNER_ROLE_KEYS,
  PARTNER_STATUS_KEYS,
  PAYOUT_METHODS,
  REFERRAL_STATUS_KEYS,
  RESOURCE_CATEGORIES,
  RULE_SCOPES,
  SECTORS,
  TICKET_CATEGORIES,
  TIER_KEYS,
} from "./constants";
import { parseMoney } from "./money";
import { SLUG_PATTERN } from "@/lib/validation/projects";

/**
 * Validação do Rocket Alliance, compartilhada entre formulários e API. O servidor valida sempre:
 * a checagem no navegador é só para o erro aparecer antes.
 */

const email = z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(160, "O e-mail pode ter até 160 caracteres.");
const phone = z
  .string()
  .trim()
  .refine(isValidPhone, "Informe um telefone com DDD.")
  .transform(phoneDigits);
const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidPhone(v), "Informe um telefone com DDD.")
  .transform((v) => (v ? phoneDigits(v) : ""));

/** Site com ou sem https:// (a pessoa costuma digitar só "empresa.com.br"). Sempre gravado com https. */
export const websiteUrl = z
  .string()
  .trim()
  .max(300, "O site pode ter até 300 caracteres.")
  .transform((v) => (v && !/^[a-z]+:\/\//i.test(v) ? `https://${v}` : v))
  .refine((v) => {
    if (v === "") return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" && u.hostname.includes(".");
    } catch {
      return false;
    }
  }, "Informe um endereço como empresa.com.br.");

/** Valor em reais digitado ("1.500,00") → centavos. Nunca zero; negativo só quando permitido. */
export const moneyInput = (label: string, { allowNegative = false } = {}) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const cents = parseMoney(v);
    if (cents === null || (!allowNegative && cents < 0) || cents === 0) {
      ctx.addIssue({ code: "custom", message: `Informe ${label} válido.` });
      return z.NEVER;
    }
    return cents;
  });

/** Igual, mas vazio (ou null) vira null. */
export const optionalMoneyInput = (label: string) =>
  z.union([z.string(), z.number(), z.null()]).transform((v, ctx): number | null => {
    if (v === "" || v === null) return null;
    const cents = parseMoney(v);
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: "custom", message: `Informe ${label} válido.` });
      return z.NEVER;
    }
    return cents;
  });

const uuidList = z.array(z.string().uuid()).max(200);
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const optionalDate = z.union([z.literal(""), dateString]).transform((v) => v || null);

/* -------------------------------------------------------------------------- */
/* Candidatura (página pública)                                                */
/* -------------------------------------------------------------------------- */

export const applicationSchema = z.object({
  name: text(80, "O nome"),
  company: text(120, "A empresa"),
  email,
  website: websiteUrl,
  phone,
  sector: z.enum(SECTORS, { message: "Escolha a área de atuação." }),
  modality: z.enum(MODALITY_KEYS, { message: "Escolha a modalidade." }),
  companyDescription: text(1200, "A descrição da empresa").refine((v) => v.length >= 20, "Conte um pouco mais sobre a empresa (pelo menos 20 caracteres)."),
  interest: text(1200, "O interesse na parceria").refine((v) => v.length >= 20, "Conte um pouco mais (pelo menos 20 caracteres)."),
  consentPrivacy: z.literal(true, { message: "É preciso autorizar o uso dos dados para avaliar a candidatura." }),
  consentMarketing: z.boolean().default(false),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const applicationDecisionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, "Use só letras minúsculas, números e hífens.").min(2).max(60),
    tierKey: z.enum(TIER_KEYS),
    modalities: z.array(z.enum(MODALITY_KEYS)).min(1, "Escolha ao menos uma modalidade."),
    message: optionalText(2000, "A mensagem"),
  }),
  z.object({ action: z.literal("reject"), message: text(2000, "O motivo") }),
  z.object({ action: z.literal("request_info"), message: text(2000, "O pedido") }),
  z.object({ action: z.literal("note"), message: text(2000, "A anotação") }),
]);

export const applicationListSchema = z.object({ status: z.enum(APPLICATION_STATUS_KEYS).optional(), q: z.string().max(100).optional() });

/* -------------------------------------------------------------------------- */
/* Parceiro (CMS)                                                              */
/* -------------------------------------------------------------------------- */

const mediaRef = z.string().uuid("Imagem inválida.").nullable();

export const PARTNER_LIMITS = { specialties: 12, services: 12, social: 8, gallery: 16, projects: 12, testimonials: 8 } as const;

export const partnerInputSchema = z.object({
  tradeName: text(80, "O nome comercial"),
  legalName: optionalText(160, "A razão social"),
  taxId: optionalText(20, "O CNPJ"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "O endereço precisa de pelo menos 2 caracteres.")
    .max(60, "O endereço pode ter até 60 caracteres.")
    .regex(SLUG_PATTERN, "Use só letras minúsculas, números e hífens entre palavras."),
  status: z.enum(PARTNER_STATUS_KEYS),
  tierKey: z.enum(TIER_KEYS),
  modalities: z.array(z.enum(MODALITY_KEYS)).min(1, "Escolha ao menos uma modalidade."),
  contactName: optionalText(80, "O nome do contato"),
  contactEmail: z.union([z.literal(""), email]),
  contactPhone: optionalPhone,
  sector: optionalText(60, "O setor"),
  shortDescription: optionalText(220, "A descrição curta"),
  description: optionalText(4000, "A descrição completa"),
  specialties: z.array(text(50, "Cada especialidade")).max(PARTNER_LIMITS.specialties),
  services: z.array(text(60, "Cada serviço")).max(PARTNER_LIMITS.services),
  websiteUrl: optionalHttpsUrl,
  socialLinks: z.array(z.object({ label: text(30, "O nome da rede"), url: optionalHttpsUrl.refine((v) => v !== "", "Informe o endereço.") })).max(PARTNER_LIMITS.social),
  location: optionalText(80, "A localização"),
  logoMediaId: mediaRef,
  logoAltMediaId: mediaRef,
  coverMediaId: mediaRef,
  ogMediaId: mediaRef,
  accentColor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, "Use uma cor no formato #1a2b3c."),
  gallery: z.array(z.object({ mediaId: z.string().uuid(), caption: optionalText(140, "A legenda") })).max(PARTNER_LIMITS.gallery),
  projectIds: uuidList.max(PARTNER_LIMITS.projects),
  testimonials: z
    .array(z.object({ quote: text(600, "O depoimento"), author: text(80, "O autor"), role: optionalText(80, "O cargo"), approved: z.boolean() }))
    .max(PARTNER_LIMITS.testimonials),
  seoTitle: optionalText(70, "O título para buscadores"),
  seoDescription: optionalText(170, "A descrição para buscadores"),
  showTier: z.boolean(),
  managersInvite: z.boolean(),
  qualityScore: z.number().int().min(1).max(5).nullable(),
  satisfactionScore: z.number().int().min(1).max(5).nullable(),
  complianceOk: z.boolean(),
  internalNotes: optionalText(4000, "As anotações"),
});
export type PartnerInput = z.infer<typeof partnerInputSchema>;

/** O que a empresa parceira pode pedir para mudar pelo Hub (sempre com aprovação da Rocket). */
export const partnerSelfEditSchema = z.object({
  tradeName: text(80, "O nome comercial"),
  shortDescription: optionalText(220, "A descrição curta"),
  description: optionalText(4000, "A descrição completa"),
  websiteUrl: websiteUrl,
  location: optionalText(80, "A localização"),
  specialties: z.array(text(50, "Cada especialidade")).max(PARTNER_LIMITS.specialties),
  services: z.array(text(60, "Cada serviço")).max(PARTNER_LIMITS.services),
  socialLinks: z.array(z.object({ label: text(30, "O nome da rede"), url: optionalHttpsUrl.refine((v) => v !== "", "Informe o endereço.") })).max(PARTNER_LIMITS.social),
  logoMediaId: mediaRef.optional(),
});
export type PartnerSelfEdit = z.infer<typeof partnerSelfEditSchema>;

/** Dados internos que o próprio parceiro atualiza sem aprovação (não aparecem no site). */
export const partnerContactSchema = z.object({
  contactName: optionalText(80, "O nome do contato"),
  contactEmail: z.union([z.literal(""), email]),
  contactPhone: optionalPhone,
});

export const directoryOrderSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

/* -------------------------------------------------------------------------- */
/* Pessoas do Hub                                                              */
/* -------------------------------------------------------------------------- */

export const partnerInviteSchema = z.object({ name: text(80, "O nome"), email, role: z.enum(PARTNER_ROLE_KEYS) });
export const partnerMemberUpdateSchema = z.object({ role: z.enum(PARTNER_ROLE_KEYS).optional(), status: z.enum(["active", "disabled"]).optional() });

/* -------------------------------------------------------------------------- */
/* Indicações                                                                  */
/* -------------------------------------------------------------------------- */

export const referralInputSchema = z.object({
  companyName: text(120, "O nome da empresa"),
  companyWebsite: websiteUrl,
  companyTaxId: optionalText(20, "O CNPJ"),
  contactName: text(80, "O nome do contato"),
  contactRole: optionalText(60, "O cargo"),
  contactEmail: email,
  contactPhone: optionalPhone,
  city: optionalText(80, "A cidade"),
  need: text(2000, "A necessidade do cliente").refine((v) => v.length >= 15, "Descreva a necessidade com um pouco mais de detalhe."),
  services: z.array(text(60, "Cada serviço")).max(8),
  estimatedValue: optionalMoneyInput("um valor").optional(),
  consentConfirmed: z.literal(true, { message: "Confirme que o cliente autorizou o contato da Rocket Vision." }),
});
export type ReferralInput = z.infer<typeof referralInputSchema>;

export const referralUpdateSchema = z.object({
  status: z.enum(REFERRAL_STATUS_KEYS).optional(),
  note: optionalText(2000, "A observação").optional(),
  noteVisibleToPartner: z.boolean().optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  dealValue: optionalMoneyInput("o valor do contrato").optional(),
  lostReason: optionalText(500, "O motivo").optional(),
  internalNotes: optionalText(4000, "As anotações").optional(),
  /** Reatribuir a outro parceiro (regra de atribuição): sempre com justificativa. */
  reassignTo: z.string().uuid().optional(),
  reassignReason: optionalText(500, "A justificativa").optional(),
  extendProtectionDays: z.number().int().min(1).max(365).optional(),
  version: z.number().int().positive(),
});

export const referralNoteSchema = z.object({ note: text(2000, "A mensagem") });

/* -------------------------------------------------------------------------- */
/* Comissões                                                                   */
/* -------------------------------------------------------------------------- */

export const ruleInputSchema = z
  .object({
    name: text(80, "O nome"),
    partnerId: z.string().uuid().nullable(),
    tierKey: z.enum(TIER_KEYS).nullable(),
    modalityKey: z.enum(MODALITY_KEYS).nullable(),
    scope: z.enum(RULE_SCOPES.map((s) => s.key) as ["all", "one_time", "recurring"]),
    ratePercent: z.string().trim().regex(/^\d{1,3}([.,]\d{1,2})?$/, "Informe um percentual como 5 ou 7,5."),
    recurringMonths: z.number().int().min(0).max(120),
    validFrom: dateString,
    validTo: optionalDate,
    isPublic: z.boolean(),
    notes: optionalText(1000, "As observações"),
  })
  .refine((v) => !v.validTo || v.validTo >= v.validFrom, { message: "O fim da vigência precisa ser depois do início.", path: ["validTo"] })
  .refine((v) => !v.isPublic || (!v.partnerId && v.tierKey), { message: "Só regras gerais por nível podem aparecer no site.", path: ["isPublic"] });

export const receiptInputSchema = z
  .object({
    referralId: z.string().uuid(),
    kind: z.enum(["one_time", "recurring", "refund"]),
    installmentNumber: z.number().int().min(1).max(600).nullable(),
    amount: moneyInput("o valor recebido"),
    receivedOn: dateString,
    refundOf: z.string().uuid().nullable(),
    description: optionalText(300, "A descrição"),
    externalRef: optionalText(120, "A referência").transform((v) => v || null),
  })
  .refine((v) => (v.kind === "recurring") === (v.installmentNumber !== null), { message: "Informe o número da mensalidade.", path: ["installmentNumber"] })
  .refine((v) => (v.kind === "refund") === (v.refundOf !== null), { message: "Escolha o recebimento reembolsado.", path: ["refundOf"] });

export const adjustmentInputSchema = z.object({
  partnerId: z.string().uuid(),
  referralId: z.string().uuid().nullable(),
  amount: moneyInput("o valor do ajuste", { allowNegative: true }),
  reason: text(500, "O motivo"),
});

export const entryActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  action: z.enum(["approve", "cancel"]),
  reason: optionalText(500, "O motivo"),
});

export const payoutInputSchema = z.object({
  partnerId: z.string().uuid(),
  entryIds: z.array(z.string().uuid()).min(1, "Escolha os lançamentos pagos.").max(500),
  paidOn: dateString,
  method: z.enum(PAYOUT_METHODS),
  reference: optionalText(120, "A referência"),
  notes: optionalText(1000, "As observações"),
  /** Total conferido na tela: precisa bater com a soma calculada pelo servidor. */
  expectedTotalCents: z.number().int(),
  idempotencyKey: z.string().uuid(),
});

export const payoutVoidSchema = z.object({ reason: text(500, "O motivo") });

/* -------------------------------------------------------------------------- */
/* Contratos, recursos, oportunidades, comunicados, suporte                    */
/* -------------------------------------------------------------------------- */

export const contractInputSchema = z
  .object({
    partnerId: z.string().uuid(),
    title: text(120, "O título"),
    kind: z.enum(CONTRACT_KINDS.map((k) => k.key) as ["partnership", "addendum", "nda", "other"]),
    startsOn: optionalDate,
    endsOn: optionalDate,
    terms: optionalText(60_000, "O texto do termo"),
    commercialTerms: optionalText(4000, "As condições comerciais"),
    fileId: z.string().uuid().nullable(),
  })
  .refine((v) => !v.endsOn || !v.startsOn || v.endsOn >= v.startsOn, { message: "O fim da vigência precisa ser depois do início.", path: ["endsOn"] });

export const contractStatusSchema = z.object({
  action: z.enum(["send", "activate", "terminate", "expire", "back_to_draft"]),
});
export const CONTRACT_STATUS_KEYS = CONTRACT_STATUSES.map((s) => s.key);

const audienceSchema = {
  minTierRank: z.number().int().min(1).max(3),
  modalities: z.array(z.enum(MODALITY_KEYS)).max(4),
  partnerIds: uuidList,
};

export const resourceInputSchema = z
  .object({
    title: text(120, "O título"),
    description: optionalText(1000, "A descrição"),
    category: z.enum(RESOURCE_CATEGORIES.map((c) => c.key) as ["sales", "brand", "documents", "presentations", "training", "exclusive"]),
    fileId: z.string().uuid().nullable(),
    url: z.union([z.literal(""), optionalHttpsUrl]).transform((v) => v || null),
    status: z.enum(["draft", "published"]),
    sortOrder: z.number().int().min(0).max(10_000),
    ...audienceSchema,
  })
  .refine((v) => (v.fileId === null) !== (v.url === null), { message: "Envie um arquivo ou informe um link (um dos dois).", path: ["url"] });

export const opportunityInputSchema = z.object({
  title: text(120, "O título"),
  kind: z.enum(OPPORTUNITY_KINDS.map((k) => k.key) as ["joint_project", "subcontracting", "co_marketing", "integration", "other"]),
  summary: text(300, "O resumo"),
  description: optionalText(5000, "A descrição"),
  status: z.enum(OPPORTUNITY_STATUSES.map((s) => s.key) as ["draft", "open", "closed"]),
  deadline: optionalDate,
  ...audienceSchema,
});

export const interestSchema = z.object({ message: optionalText(1000, "A mensagem") });
export const interestDecisionSchema = z.object({ status: z.enum(["accepted", "declined"]) });

export const announcementInputSchema = z.object({
  title: text(120, "O título"),
  body: text(5000, "O comunicado"),
  important: z.boolean(),
  ...audienceSchema,
});

export const ticketInputSchema = z.object({
  subject: text(120, "O assunto"),
  category: z.enum(TICKET_CATEGORIES.map((c) => c.key) as ["referral", "commission", "technical", "commercial", "account", "other"]),
  body: text(4000, "A mensagem"),
});
export const ticketReplySchema = z.object({ body: text(4000, "A mensagem"), close: z.boolean().optional() });
export const ticketStatusSchema = z.object({ status: z.enum(["open", "answered", "closed"]), assignedTo: z.string().uuid().nullable().optional() });

export const changeRequestDecisionSchema = z.object({ action: z.enum(["approve", "reject"]), note: optionalText(1000, "A observação") });
export const tierChangeSchema = z.object({ tierKey: z.enum(TIER_KEYS), reason: text(500, "O motivo") });

/* -------------------------------------------------------------------------- */
/* Configurações                                                               */
/* -------------------------------------------------------------------------- */

export const programSettingsSchema = z.object({
  /** Dias de proteção de uma indicação para o parceiro que registrou primeiro. */
  protectionDays: z.number().int().min(7).max(365),
  /** Mensalidades com participação quando a regra não diz outra coisa. */
  defaultRecurringMonths: z.number().int().min(0).max(120),
  /** Quem recebe o aviso de novas candidaturas, indicações e chamados. Vazio: só no CMS. */
  notifyEmail: z.union([z.literal(""), email]),
  /** Endereço de resposta mostrado no Hub para assuntos do programa. */
  supportEmail: z.union([z.literal(""), email]),
  paymentTerms: optionalText(600, "As condições de pagamento"),
});
export type ProgramSettings = z.infer<typeof programSettingsSchema>;

export const DEFAULT_PROGRAM_SETTINGS: ProgramSettings = {
  protectionDays: 90,
  defaultRecurringMonths: 12,
  notifyEmail: "",
  supportEmail: "",
  paymentTerms: "Os pagamentos são feitos após a aprovação da comissão, conforme o termo de parceria.",
};

export const modalityUpdateSchema = z.object({ name: text(60, "O nome"), description: text(800, "A descrição"), isActive: z.boolean() });
export const tierUpdateSchema = z.object({
  name: text(60, "O nome"),
  label: optionalText(60, "O rótulo"),
  description: text(800, "A descrição"),
  benefits: z.array(text(120, "Cada benefício")).min(1).max(10),
});

/* -------------------------------------------------------------------------- */
/* Hub: conta                                                                  */
/* -------------------------------------------------------------------------- */

export const hubLoginSchema = z.object({ email: z.string().trim().max(160), password: z.string().min(1).max(256) });
export const hubTwoFactorSchema = z.object({ challenge: z.string().regex(/^[a-z2-7]{52}$/), code: z.string().trim().max(20) });
export const totpConfirmSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Digite os 6 números do aplicativo.") });
export const totpDisableSchema = z.object({ password: z.string().min(1).max(256) });
export const hubProfileSchema = z.object({ name: text(80, "O nome") });
export const emailChangeSchema = z.object({ email, password: z.string().min(1).max(256) });
