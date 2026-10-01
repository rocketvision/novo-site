/**
 * Rocket Alliance: o programa oficial de parcerias da Rocket Vision.
 *
 * Vocabulário do domínio, compartilhado entre o site, o Alliance Hub, o CMS e o servidor.
 * Os nomes e textos oficiais do programa estão aqui e não devem ser reescritos: são a comunicação
 * aprovada. Descrições de modalidades e níveis também ficam no banco (editáveis em Configurações do
 * programa); os daqui são os valores iniciais e a reserva quando o banco não responde.
 */

export const PROGRAM = {
  name: "Rocket Alliance",
  signature: "O programa de parceiros da Rocket Vision",
  slogan: "Grow Together. Go Beyond.",
  complement: "Um ecossistema. Possibilidades infinitas.",
  publicMessage: "Grandes coisas se constroem juntas.",
  hubName: "Alliance Hub",
} as const;

/* -------------------------------------------------------------------------- */
/* Modalidades: como o parceiro atua                                           */
/* -------------------------------------------------------------------------- */

export const MODALITY_KEYS = ["referral", "business", "technology", "strategic"] as const;
export type ModalityKey = (typeof MODALITY_KEYS)[number];

export const MODALITIES: Record<ModalityKey, { name: string; description: string; icon: "Handshake" | "Briefcase" | "Code" | "Compass" }> = {
  referral: {
    name: "Parceiro Indicador",
    description:
      "Destinado a profissionais e empresas que indicam clientes à Rocket Vision. O parceiro recebe uma comissão quando sua indicação resulta em um contrato efetivamente pago. Entrada simplificada.",
    icon: "Handshake",
  },
  business: {
    name: "Parceiro de Negócios",
    description:
      "Para agências de marketing, consultorias, empresas de TI e representantes comerciais que desejam incluir as soluções da Rocket em seu portfólio. Permite vendas conjuntas, propostas comerciais compartilhadas e projetos em modelo white-label, mediante aprovação.",
    icon: "Briefcase",
  },
  technology: {
    name: "Parceiro de Tecnologia",
    description:
      "Para desenvolvedores, software houses e especialistas que complementam a capacidade técnica da Rocket Vision. Permite desenvolvimento conjunto, integrações, subcontratação e participação em projetos maiores.",
    icon: "Code",
  },
  strategic: {
    name: "Parceiro Estratégico",
    description:
      "Para empresas com potencial de estabelecer relacionamentos comerciais de longo prazo. Inclui iniciativas de co-marketing, produtos conjuntos, expansão para novos mercados e condições comerciais negociadas individualmente.",
    icon: "Compass",
  },
};

export const isModalityKey = (v: string): v is ModalityKey => (MODALITY_KEYS as readonly string[]).includes(v);

/* -------------------------------------------------------------------------- */
/* Níveis: quais benefícios o parceiro tem                                     */
/* -------------------------------------------------------------------------- */

export const TIER_KEYS = ["member", "pro", "elite"] as const;
export type TierKey = (typeof TIER_KEYS)[number];

export const TIERS: Record<TierKey, { name: string; rank: number; label: string; description: string; benefits: string[] }> = {
  member: {
    name: "Alliance Member",
    rank: 1,
    label: "Nível inicial",
    description: "Nível inicial. Acesso ao portal, registro de indicações, materiais comerciais e comissões básicas.",
    benefits: ["Acesso ao portal", "Registro de indicações", "Materiais comerciais", "Comissões básicas"],
  },
  pro: {
    name: "Alliance Pro",
    rank: 2,
    label: "Nível de crescimento",
    description: "Nível de crescimento. Condições comerciais ampliadas, treinamentos exclusivos, suporte prioritário e participação em campanhas conjuntas.",
    benefits: ["Condições comerciais ampliadas", "Treinamentos exclusivos", "Suporte prioritário", "Participação em campanhas conjuntas"],
  },
  elite: {
    name: "Alliance Elite",
    rank: 3,
    label: "Nível exclusivo",
    description: "Nível exclusivo. Gestão de conta dedicada, planejamento comercial conjunto, acesso antecipado a novas soluções e condições personalizadas.",
    benefits: ["Gestão de conta dedicada", "Planejamento comercial conjunto", "Acesso antecipado a novas soluções", "Condições personalizadas"],
  },
};

export const isTierKey = (v: string): v is TierKey => (TIER_KEYS as readonly string[]).includes(v);
export const tierRank = (key: string) => (isTierKey(key) ? TIERS[key].rank : 0);

/** Critérios de evolução de nível: não dependem só do faturamento. */
export const TIER_CRITERIA = [
  "Resultados comerciais",
  "Qualidade das indicações",
  "Satisfação dos clientes",
  "Cumprimento das regras do programa",
] as const;

/* -------------------------------------------------------------------------- */
/* Jornada                                                                     */
/* -------------------------------------------------------------------------- */

export const JOURNEY = [
  { key: "apply", name: "Apply", label: "Inscrição" },
  { key: "review", name: "Review & Approval", label: "Análise e aprovação" },
  { key: "onboarding", name: "Onboarding", label: "Contrato, orientações e acesso" },
  { key: "grow", name: "Start Growing", label: "Indicações, oportunidades e projetos" },
  { key: "rewards", name: "Rewards & Recognition", label: "Comissões, resultados e reconhecimento" },
] as const;

/* -------------------------------------------------------------------------- */
/* Candidaturas                                                                */
/* -------------------------------------------------------------------------- */

export const APPLICATION_STATUSES = [
  { key: "pending_review", label: "Pending Review", tone: "blue" },
  { key: "info_requested", label: "Information Requested", tone: "amber" },
  { key: "approved", label: "Approved", tone: "green" },
  { key: "rejected", label: "Rejected", tone: "neutral" },
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["key"];
export const APPLICATION_STATUS_KEYS = APPLICATION_STATUSES.map((s) => s.key) as [ApplicationStatus, ...ApplicationStatus[]];
export const applicationStatusLabel = (key: string) => APPLICATION_STATUSES.find((s) => s.key === key)?.label ?? key;

/** Áreas de atuação oferecidas no formulário de candidatura (e usadas como setor no diretório). */
export const SECTORS = [
  "Agência de marketing",
  "Consultoria",
  "Empresa de TI",
  "Software house",
  "Desenvolvimento independente",
  "Design e branding",
  "Representação comercial",
  "Outro",
] as const;

/* -------------------------------------------------------------------------- */
/* Parceiros                                                                   */
/* -------------------------------------------------------------------------- */

export const PARTNER_STATUSES = [
  { key: "onboarding", label: "Onboarding", tone: "blue" },
  { key: "active", label: "Ativo", tone: "green" },
  { key: "suspended", label: "Suspenso", tone: "amber" },
  { key: "terminated", label: "Encerrado", tone: "neutral" },
] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number]["key"];
export const PARTNER_STATUS_KEYS = PARTNER_STATUSES.map((s) => s.key) as [PartnerStatus, ...PartnerStatus[]];
export const partnerStatusLabel = (key: string) => PARTNER_STATUSES.find((s) => s.key === key)?.label ?? key;
/** Situações em que as pessoas da empresa entram no Alliance Hub. */
export const HUB_OPEN_STATUSES: PartnerStatus[] = ["onboarding", "active"];

/* -------------------------------------------------------------------------- */
/* Alliance Hub: papéis dentro da empresa parceira                             */
/* -------------------------------------------------------------------------- */

export const PARTNER_ROLES = [
  { key: "owner", label: "Responsável", description: "Responsável pela empresa: acesso completo, equipe, contratos e ganhos." },
  { key: "manager", label: "Gestor", description: "Gerencia indicações, oportunidades e dados da empresa. Vê os ganhos." },
  { key: "member", label: "Membro", description: "Registra e acompanha as próprias indicações, acessa materiais e suporte." },
] as const;
export type PartnerRole = (typeof PARTNER_ROLES)[number]["key"];
export const PARTNER_ROLE_KEYS = PARTNER_ROLES.map((r) => r.key) as [PartnerRole, ...PartnerRole[]];
export const partnerRoleLabel = (key: string) => PARTNER_ROLES.find((r) => r.key === key)?.label ?? key;

/** O que cada papel pode fazer no Hub. Verificado no servidor em toda operação. */
export const HUB_PERMISSIONS = {
  "referrals.view_all": ["owner", "manager"],
  "referrals.create": ["owner", "manager", "member"],
  "earnings.view": ["owner", "manager"],
  "company.edit": ["owner", "manager"],
  "contracts.view": ["owner", "manager"],
  "contracts.accept": ["owner"],
  "team.view": ["owner", "manager"],
  "team.manage": ["owner"],
  "opportunities.interest": ["owner", "manager"],
  "support.use": ["owner", "manager", "member"],
} as const satisfies Record<string, readonly PartnerRole[]>;
export type HubPermission = keyof typeof HUB_PERMISSIONS;

export function hubCan(role: PartnerRole, permission: HubPermission, options: { managersInvite?: boolean } = {}) {
  // Com a opção ligada para a empresa, o Gestor também convida (só membros).
  if (permission === "team.manage" && role === "manager" && options.managersInvite) return true;
  return (HUB_PERMISSIONS[permission] as readonly string[]).includes(role);
}

/* -------------------------------------------------------------------------- */
/* Indicações                                                                  */
/* -------------------------------------------------------------------------- */

export const REFERRAL_STATUSES = [
  { key: "submitted", label: "Submitted", tone: "blue" },
  { key: "under_review", label: "Under Review", tone: "amber" },
  { key: "qualified", label: "Qualified", tone: "violet" },
  { key: "in_negotiation", label: "In Negotiation", tone: "indigo" },
  { key: "won", label: "Won", tone: "green" },
  { key: "lost", label: "Lost", tone: "neutral" },
  { key: "cancelled", label: "Cancelled", tone: "neutral" },
] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]["key"];
export const REFERRAL_STATUS_KEYS = REFERRAL_STATUSES.map((s) => s.key) as [ReferralStatus, ...ReferralStatus[]];
export const referralStatusLabel = (key: string) => REFERRAL_STATUSES.find((s) => s.key === key)?.label ?? key;

/** Indicações ainda em jogo: seguram a proteção da oportunidade. */
export const OPEN_REFERRAL_STATUSES: ReferralStatus[] = ["submitted", "under_review", "qualified", "in_negotiation"];

/** Transições que a equipe Rocket pode fazer. Perdida e cancelada podem ser reabertas para análise. */
export const REFERRAL_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  submitted: ["under_review", "qualified", "lost", "cancelled"],
  under_review: ["qualified", "lost", "cancelled"],
  qualified: ["in_negotiation", "won", "lost", "cancelled"],
  in_negotiation: ["won", "lost", "cancelled"],
  won: ["cancelled"],
  lost: ["under_review"],
  cancelled: ["under_review"],
};

/** O parceiro só cancela a própria indicação enquanto ela ainda não foi qualificada. */
export const PARTNER_CANCELLABLE: ReferralStatus[] = ["submitted", "under_review"];

export function canTransition(from: ReferralStatus, to: ReferralStatus) {
  return REFERRAL_TRANSITIONS[from].includes(to);
}

/* -------------------------------------------------------------------------- */
/* Comissões e pagamentos                                                      */
/* -------------------------------------------------------------------------- */

export const COMMISSION_STATUSES = [
  { key: "pending", label: "Pendente", tone: "amber" },
  { key: "approved", label: "Aprovada", tone: "blue" },
  { key: "paid", label: "Paga", tone: "green" },
  { key: "cancelled", label: "Cancelada", tone: "neutral" },
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number]["key"];
export const commissionStatusLabel = (key: string) => COMMISSION_STATUSES.find((s) => s.key === key)?.label ?? key;

export const COMMISSION_KINDS = [
  { key: "commission", label: "Comissão" },
  { key: "reversal", label: "Estorno" },
  { key: "adjustment", label: "Ajuste" },
] as const;
export type CommissionKind = (typeof COMMISSION_KINDS)[number]["key"];
export const commissionKindLabel = (key: string) => COMMISSION_KINDS.find((s) => s.key === key)?.label ?? key;

export const RULE_STATUSES = [
  { key: "draft", label: "Aguardando aprovação", tone: "amber" },
  { key: "approved", label: "Aprovada", tone: "green" },
  { key: "archived", label: "Arquivada", tone: "neutral" },
] as const;
export type RuleStatus = (typeof RULE_STATUSES)[number]["key"];

/** A que receitas a regra se aplica. */
export const RULE_SCOPES = [
  { key: "all", label: "Projetos e mensalidades" },
  { key: "one_time", label: "Só projetos (pagamento único)" },
  { key: "recurring", label: "Só serviços recorrentes" },
] as const;
export type RuleScope = (typeof RULE_SCOPES)[number]["key"];

export const RECEIPT_KINDS = [
  { key: "one_time", label: "Pagamento de projeto" },
  { key: "recurring", label: "Mensalidade" },
  { key: "refund", label: "Reembolso" },
] as const;
export type ReceiptKind = (typeof RECEIPT_KINDS)[number]["key"];

export const PAYOUT_METHODS = ["Pix", "Transferência bancária", "Outro"] as const;

/* -------------------------------------------------------------------------- */
/* Contratos, recursos, oportunidades, suporte                                 */
/* -------------------------------------------------------------------------- */

export const CONTRACT_STATUSES = [
  { key: "draft", label: "Rascunho", tone: "neutral" },
  { key: "sent", label: "Aguardando aceite", tone: "amber" },
  { key: "active", label: "Vigente", tone: "green" },
  { key: "expired", label: "Vencido", tone: "neutral" },
  { key: "terminated", label: "Encerrado", tone: "red" },
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]["key"];
export const contractStatusLabel = (key: string) => CONTRACT_STATUSES.find((s) => s.key === key)?.label ?? key;

export const CONTRACT_KINDS = [
  { key: "partnership", label: "Termo de parceria" },
  { key: "addendum", label: "Aditivo" },
  { key: "nda", label: "Acordo de confidencialidade" },
  { key: "other", label: "Outro" },
] as const;

export const RESOURCE_CATEGORIES = [
  { key: "sales", label: "Materiais comerciais" },
  { key: "brand", label: "Identidade visual" },
  { key: "documents", label: "Documentos" },
  { key: "presentations", label: "Apresentações" },
  { key: "training", label: "Treinamentos" },
  { key: "exclusive", label: "Exclusivos" },
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]["key"];

export const OPPORTUNITY_KINDS = [
  { key: "joint_project", label: "Projeto conjunto" },
  { key: "subcontracting", label: "Subcontratação" },
  { key: "co_marketing", label: "Co-marketing" },
  { key: "integration", label: "Integração" },
  { key: "other", label: "Outra" },
] as const;

export const OPPORTUNITY_STATUSES = [
  { key: "draft", label: "Rascunho", tone: "neutral" },
  { key: "open", label: "Aberta", tone: "green" },
  { key: "closed", label: "Encerrada", tone: "neutral" },
] as const;

export const TICKET_CATEGORIES = [
  { key: "referral", label: "Indicações" },
  { key: "commission", label: "Comissões e pagamentos" },
  { key: "technical", label: "Apoio técnico" },
  { key: "commercial", label: "Comercial" },
  { key: "account", label: "Conta e acesso" },
  { key: "other", label: "Outro assunto" },
] as const;

export const TICKET_STATUSES = [
  { key: "open", label: "Aberto", tone: "blue" },
  { key: "answered", label: "Respondido", tone: "green" },
  { key: "closed", label: "Encerrado", tone: "neutral" },
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number]["key"];

/** Público de um conteúdo segmentado (recurso, oportunidade, comunicado). Vazio = todos. */
export type Audience = { minTierRank: number; modalities: string[]; partnerIds: string[] };

export function matchesAudience(audience: Audience, partner: { id: string; tierKey: string; modalities: string[] }) {
  if (audience.partnerIds.length > 0 && !audience.partnerIds.includes(partner.id)) return false;
  if (tierRank(partner.tierKey) < audience.minTierRank) return false;
  if (audience.modalities.length > 0 && !audience.modalities.some((m) => partner.modalities.includes(m))) return false;
  return true;
}
