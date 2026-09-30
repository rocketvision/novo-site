import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { env } from "@/server/env";
import { log } from "@/server/log";
import { sendMail, type Mail } from "@/server/mail";
import { render, type Template } from "@/server/mail-templates";
import { PROGRAM, referralStatusLabel } from "@/lib/alliance/constants";
import { formatMoney } from "@/lib/alliance/money";

/**
 * E-mails do Rocket Alliance, com o mesmo visual dos e-mails da Rocket Vision.
 *
 * Todo envio passa por `deliver`, que registra o estado em `alliance_email_log`:
 * - `dedupe_key` único: o mesmo evento nunca envia o mesmo e-mail duas vezes (clique repetido,
 *   requisição reenviada, duas abas);
 * - falhas ficam registradas com o motivo e podem ser reenviadas pelo CMS (Comunicações > Envios),
 *   exceto e-mails com link de uso único (convites, senha), que exigem gerar um link novo.
 */

const PRODUCT = { label: PROGRAM.name, footer: `E-mail automático do ${PROGRAM.name}, ${PROGRAM.signature}` };
const siteOrigin = () => new URL(env.NEXT_PUBLIC_SITE_URL).origin;
export const hubUrl = (path = "") => `${siteOrigin()}/alliance${path}`;
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

const brand = (t: Omit<Template, "product">): Mail => render({ ...t, product: PRODUCT });

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

type P = Record<string, string>;

/** Templates que podem ser reenviados a partir dos parâmetros guardados (sem links de uso único). */
export const TEMPLATES = {
  application_received: (to: string, p: P) =>
    brand({
      to,
      subject: `Recebemos a sua candidatura ao ${PROGRAM.name}`,
      preheader: "A sua candidatura está em análise pela equipe da Rocket Vision.",
      eyebrow: PROGRAM.signature,
      title: "Candidatura recebida",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: [
        `Recebemos a candidatura da ${p.company} ao ${PROGRAM.name}, o programa oficial de parcerias da Rocket Vision.`,
        "A nossa equipe vai analisar o perfil da empresa e a modalidade escolhida. Se precisarmos de mais informações, falamos com você por este e-mail.",
      ],
      details: [
        { label: "Empresa", value: p.company },
        { label: "Modalidade", value: p.modality },
        { label: "Situação", value: "Pending Review" },
      ],
      note: [PROGRAM.slogan],
    }),
  application_approved: (to: string, p: P) =>
    brand({
      to,
      subject: `Bem-vindo ao ${PROGRAM.name}`,
      preheader: "A sua candidatura foi aprovada. Os próximos passos são o contrato e o acesso ao Alliance Hub.",
      eyebrow: PROGRAM.signature,
      title: "Candidatura aprovada",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: [
        `A candidatura da ${p.company} ao ${PROGRAM.name} foi aprovada. ${PROGRAM.publicMessage}`,
        "Agora seguimos para o onboarding: termo de parceria, orientações e o convite para o Alliance Hub, o portal exclusivo dos parceiros. O convite chega em um e-mail separado.",
        ...(p.message ? [p.message] : []),
      ],
      note: [PROGRAM.slogan],
    }),
  application_rejected: (to: string, p: P) =>
    brand({
      to,
      subject: `Sobre a sua candidatura ao ${PROGRAM.name}`,
      preheader: "A equipe da Rocket Vision concluiu a análise da sua candidatura.",
      eyebrow: PROGRAM.signature,
      title: "Resultado da análise",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: [
        `Obrigado pelo interesse da ${p.company} no ${PROGRAM.name}. Depois da análise, neste momento não vamos seguir com a parceria.`,
        p.message,
      ].filter(Boolean),
      note: ["Você pode se candidatar novamente no futuro, pela página do programa."],
    }),
  application_info_requested: (to: string, p: P) =>
    brand({
      to,
      subject: `Precisamos de mais informações sobre a ${p.company}`,
      preheader: "Para seguir com a análise da candidatura, precisamos de alguns detalhes.",
      eyebrow: PROGRAM.signature,
      title: "Mais informações",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: ["Para seguir com a análise da sua candidatura ao Rocket Alliance, precisamos de algumas informações:", p.message, "Basta responder a este e-mail."],
      note: [],
    }),
  referral_received: (to: string, p: P) =>
    brand({
      to,
      subject: `Indicação ${p.code} registrada`,
      preheader: `A indicação da ${p.company} está registrada e protegida no seu nome.`,
      eyebrow: PROGRAM.hubName,
      title: "Indicação recebida",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: [`Registramos a sua indicação da ${p.company}. A equipe da Rocket Vision vai analisar e você acompanha cada etapa pelo Alliance Hub.`],
      details: [
        { label: "Identificador", value: p.code },
        { label: "Empresa indicada", value: p.company },
        { label: "Protegida até", value: p.protectedUntil },
      ],
      action: { label: "Acompanhar indicação", url: hubUrl(`/indicacoes/${p.id}`) },
      note: [],
    }),
  referral_status: (to: string, p: P) =>
    brand({
      to,
      subject: `Indicação ${p.code}: ${referralStatusLabel(p.status)}`,
      preheader: `A indicação da ${p.company} mudou para ${referralStatusLabel(p.status)}.`,
      eyebrow: PROGRAM.hubName,
      title: "Mudança de status",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: [`A indicação da ${p.company} mudou de etapa.`, ...(p.note ? [p.note] : [])],
      details: [
        { label: "Identificador", value: p.code },
        { label: "Novo status", value: referralStatusLabel(p.status) },
      ],
      action: { label: "Ver no Alliance Hub", url: hubUrl(`/indicacoes/${p.id}`) },
      note: [],
    }),
  commission_approved: (to: string, p: P) =>
    brand({
      to,
      subject: "Comissão aprovada",
      preheader: `${formatMoney(Number(p.amountCents))} em comissões aprovadas.`,
      eyebrow: PROGRAM.hubName,
      title: "Comissão aprovada",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: ["A equipe da Rocket Vision aprovou lançamentos de comissão da sua empresa. Eles entram no próximo pagamento, conforme o termo de parceria."],
      details: [
        { label: "Valor aprovado", value: formatMoney(Number(p.amountCents)) },
        { label: "Lançamentos", value: p.count },
      ],
      action: { label: "Ver ganhos", url: hubUrl("/ganhos") },
      note: [],
    }),
  payout_registered: (to: string, p: P) =>
    brand({
      to,
      subject: "Pagamento registrado",
      preheader: `Pagamento de ${formatMoney(Number(p.amountCents))} registrado.`,
      eyebrow: PROGRAM.hubName,
      title: "Pagamento registrado",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: ["Registramos um pagamento de comissões para a sua empresa. O detalhamento dos lançamentos está no Alliance Hub."],
      details: [
        { label: "Valor", value: formatMoney(Number(p.amountCents)) },
        { label: "Data", value: p.paidOn },
        { label: "Forma", value: p.method },
      ],
      action: { label: "Ver pagamento", url: hubUrl("/ganhos") },
      note: [],
    }),
  tier_changed: (to: string, p: P) =>
    brand({
      to,
      subject: `Novo nível no ${PROGRAM.name}: ${p.tier}`,
      preheader: `A ${p.company} agora é ${p.tier}.`,
      eyebrow: PROGRAM.signature,
      title: "Mudança de nível",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: [`A ${p.company} agora está no nível ${p.tier}.`, ...(p.description ? [p.description] : [])],
      action: { label: "Ver benefícios", url: hubUrl() },
      note: [PROGRAM.slogan],
    }),
  announcement: (to: string, p: P) =>
    brand({
      to,
      subject: p.title,
      preheader: p.body.slice(0, 120),
      eyebrow: "Comunicado importante",
      title: p.title,
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: p.body.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean),
      action: { label: "Abrir no Alliance Hub", url: hubUrl("/avisos") },
      note: [],
    }),
  support_reply: (to: string, p: P) =>
    brand({
      to,
      subject: `Resposta no chamado ${p.code}`,
      preheader: `A equipe Rocket Vision respondeu: ${p.subject}`,
      eyebrow: PROGRAM.hubName,
      title: "Nova resposta no suporte",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: [`A equipe da Rocket Vision respondeu ao chamado "${p.subject}".`],
      action: { label: "Ver resposta", url: hubUrl(`/suporte/${p.id}`) },
      note: [],
    }),
  contract_sent: (to: string, p: P) =>
    brand({
      to,
      subject: `Termo para aceite: ${p.title}`,
      preheader: "Um documento do programa está esperando o seu aceite no Alliance Hub.",
      eyebrow: PROGRAM.hubName,
      title: "Termo para aceite",
      greeting: `Olá, ${firstName(p.name)}.`,
      paragraphs: [`O documento "${p.title}" está disponível no Alliance Hub para leitura e aceite.`],
      action: { label: "Ler e aceitar", url: hubUrl("/empresa#contratos") },
      note: [],
    }),
  /** Aviso interno para a equipe da Rocket (novas candidaturas, indicações e chamados). */
  team_notice: (to: string, p: P) =>
    brand({
      to,
      subject: p.subject,
      preheader: p.summary,
      eyebrow: "Rocket Alliance · equipe",
      title: p.subject,
      greeting: "Olá, equipe.",
      paragraphs: [p.summary],
      action: { label: "Abrir no Content Studio", url: p.url },
      note: [],
    }),
} satisfies Record<string, (to: string, p: P) => Mail>;

export type TemplateKey = keyof typeof TEMPLATES;

/** E-mails com link de uso único: montados na hora, nunca reenviados a partir do registro. */
export function hubInviteMail(to: string, p: { name: string; company: string; invitedBy: string; link: string }) {
  return brand({
    to,
    subject: `Seu acesso ao ${PROGRAM.hubName}`,
    preheader: `${p.invitedBy} convidou você para o portal exclusivo dos parceiros da Rocket Vision.`,
    eyebrow: PROGRAM.signature,
    title: "Convite para o Alliance Hub",
    greeting: `Olá, ${firstName(p.name)}.`,
    paragraphs: [
      `${p.invitedBy} convidou você para o Alliance Hub, o portal exclusivo dos parceiros da Rocket Vision, como parte da equipe da ${p.company}.`,
      "Para entrar, crie a sua senha pelo botão abaixo. Aceitar o convite também confirma o seu e-mail.",
    ],
    action: { label: "Criar minha senha", url: p.link },
    note: ["O link vale por 7 dias e só pode ser usado uma vez.", "Se você não esperava este convite, pode ignorar este e-mail."],
  });
}

export function hubResetMail(to: string, p: { name: string; link: string }) {
  return brand({
    to,
    subject: "Redefinição de senha do Alliance Hub",
    preheader: "Recebemos um pedido para redefinir a sua senha.",
    eyebrow: "Segurança",
    title: "Redefina a sua senha",
    greeting: `Olá, ${firstName(p.name)}.`,
    paragraphs: ["Recebemos um pedido para redefinir a senha da sua conta no Alliance Hub."],
    action: { label: "Redefinir senha", url: p.link },
    note: ["O link vale por 1 hora e só pode ser usado uma vez.", "Se você não fez esse pedido, pode ignorar este e-mail: a sua senha atual continua valendo."],
  });
}

export function hubEmailChangeMail(to: string, p: { name: string; link: string }) {
  return brand({
    to,
    subject: "Confirme o seu novo e-mail no Alliance Hub",
    preheader: "Confirme o endereço para passar a usá-lo no login.",
    eyebrow: "Segurança",
    title: "Confirme o novo e-mail",
    greeting: `Olá, ${firstName(p.name)}.`,
    paragraphs: ["Recebemos um pedido para trocar o e-mail da sua conta no Alliance Hub para este endereço. A troca só vale depois da confirmação."],
    action: { label: "Confirmar e-mail", url: p.link },
    note: ["O link vale por 24 horas e só pode ser usado uma vez.", "Se você não fez esse pedido, ignore este e-mail."],
  });
}

/* -------------------------------------------------------------------------- */
/* Envio com registro                                                          */
/* -------------------------------------------------------------------------- */

type DeliverInput = { dedupeKey: string; to: string; partnerId?: string | null } & (
  | { template: TemplateKey; params: P; mail?: never }
  | { template: string; mail: Mail; params?: never }
);

/**
 * Envia uma vez por `dedupeKey`. Se já foi enviado (ou está sendo), não envia de novo.
 * Nunca lança: falha de e-mail não pode desfazer a operação que o originou.
 */
export async function deliver(input: DeliverInput): Promise<"sent" | "failed" | "skipped" | "duplicate"> {
  try {
    const db = getDb();
    const [row] = await db
      .insert(schema.allianceEmailLog)
      .values({
        dedupeKey: input.dedupeKey.slice(0, 200),
        template: input.template,
        toEmail: input.to,
        partnerId: input.partnerId ?? null,
        params: input.params ?? null,
        attempts: 1,
      })
      .onConflictDoNothing({ target: schema.allianceEmailLog.dedupeKey })
      .returning({ id: schema.allianceEmailLog.id });
    if (!row) return "duplicate";
    const mail = input.mail ?? TEMPLATES[input.template as TemplateKey](input.to, input.params!);
    return await send(row.id, mail);
  } catch (error) {
    log.error("alliance.mail_failed", { template: input.template, error });
    return "failed";
  }
}

async function send(logId: string, mail: Mail) {
  const result = await sendMail(mail);
  const status = result.delivered ? "sent" : result.error === "not_configured" ? "skipped" : "failed";
  await getDb()
    .update(schema.allianceEmailLog)
    .set({ status, providerId: result.id ?? null, lastError: result.delivered ? null : (result.error ?? "unknown"), sentAt: result.delivered ? new Date() : null, updatedAt: new Date() })
    .where(eq(schema.allianceEmailLog.id, logId));
  return status;
}

/** Reenvio manual de um e-mail que falhou (só templates reenviáveis). */
export async function retryEmail(logId: string) {
  const db = getDb();
  const [row] = await db.select().from(schema.allianceEmailLog).where(eq(schema.allianceEmailLog.id, logId));
  if (!row || row.status === "sent" || !row.params || !(row.template in TEMPLATES)) return null;
  await db
    .update(schema.allianceEmailLog)
    .set({ attempts: sql`${schema.allianceEmailLog.attempts} + 1`, status: "sending", updatedAt: new Date() })
    .where(and(eq(schema.allianceEmailLog.id, logId), sql`${schema.allianceEmailLog.status} <> 'sent'`));
  return send(row.id, TEMPLATES[row.template as TemplateKey](row.toEmail, row.params as P));
}

export async function listEmailLog(input: { status?: string; before?: Date }) {
  const where = [
    ...(input.status ? [eq(schema.allianceEmailLog.status, input.status)] : []),
    ...(input.before ? [sql`${schema.allianceEmailLog.createdAt} < ${input.before}`] : []),
  ];
  const rows = await getDb()
    .select({
      id: schema.allianceEmailLog.id,
      template: schema.allianceEmailLog.template,
      toEmail: schema.allianceEmailLog.toEmail,
      status: schema.allianceEmailLog.status,
      attempts: schema.allianceEmailLog.attempts,
      lastError: schema.allianceEmailLog.lastError,
      canRetry: sql<boolean>`${schema.allianceEmailLog.params} IS NOT NULL`,
      createdAt: schema.allianceEmailLog.createdAt,
      sentAt: schema.allianceEmailLog.sentAt,
      partnerName: schema.partners.tradeName,
    })
    .from(schema.allianceEmailLog)
    .leftJoin(schema.partners, eq(schema.partners.id, schema.allianceEmailLog.partnerId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.allianceEmailLog.createdAt))
    .limit(51);
  return { items: rows.slice(0, 50), nextBefore: rows.length > 50 ? rows[49].createdAt : null };
}

export const TEMPLATE_LABELS: Record<string, string> = {
  application_received: "Candidatura recebida",
  application_approved: "Candidatura aprovada",
  application_rejected: "Candidatura recusada",
  application_info_requested: "Pedido de informações",
  hub_invite: "Convite para o Hub",
  hub_reset: "Redefinição de senha",
  hub_email_change: "Confirmação de e-mail",
  referral_received: "Indicação recebida",
  referral_status: "Mudança de status",
  commission_approved: "Comissão aprovada",
  payout_registered: "Pagamento registrado",
  tier_changed: "Mudança de nível",
  announcement: "Comunicado importante",
  support_reply: "Resposta no suporte",
  contract_sent: "Termo para aceite",
  team_notice: "Aviso para a equipe",
};
