import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import type { Permission } from "@/server/authz/permissions";
import { formatMoney } from "@/lib/alliance/money";

/**
 * Leituras de apoio à gestão no Studio: a ficha de um parceiro e a caixa de pendências.
 * Só leitura. Cada bloco só é consultado para quem tem a permissão da área (finanças, contratos,
 * suporte...): o dado nem sai do banco para quem não pode vê-lo.
 */

type Perms = ReadonlySet<Permission>;

/* -------------------------------------------------------------------------- */
/* Pendências                                                                  */
/* -------------------------------------------------------------------------- */

export type PendingItem = { id: string; label: string; detail: string; href: string; at: Date | null; urgent?: boolean };
export type PendingGroup = { key: string; title: string; hint: string; count: number; href: string; items: PendingItem[] };

const LIMIT = 5;
const date = (v: unknown) => (v ? new Date(v as string) : null);
const money = formatMoney;
const day = (v: unknown) => (v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(v as string)) : "");

/**
 * O que precisa de alguém da equipe agora, agrupado por tipo e só do que a pessoa pode resolver.
 * Com `partnerId`, só as pendências daquele parceiro (usado na ficha dele).
 */
export async function pendingWork(perms: Perms, partnerId?: string): Promise<PendingGroup[]> {
  const db = getDb();
  const byPartner = (column: string) => (partnerId ? sql`AND ${sql.raw(column)} = ${partnerId}` : sql``);
  const groups: PendingGroup[] = [];
  const add = async (
    group: Omit<PendingGroup, "count" | "items">,
    query: ReturnType<typeof sql>,
    map: (row: Record<string, unknown>) => PendingItem,
  ) => {
    const rows = (await db.execute<Record<string, unknown>>(query)).rows;
    if (rows.length === 0) return;
    const count = Number(rows[0].total ?? rows.length);
    groups.push({ ...group, count, items: rows.slice(0, LIMIT).map(map) });
  };

  const tasks: Promise<void>[] = [];

  if (perms.has("alliance.applications") && !partnerId) {
    tasks.push(
      add(
        { key: "applications", title: "Candidaturas para avaliar", hint: "Empresas esperando resposta sobre a entrada no programa.", href: "/cms/alliance/candidaturas" },
        sql`SELECT id, company, status, created_at, count(*) OVER()::int AS total FROM partner_applications
            WHERE status IN ('pending_review', 'info_requested') ORDER BY created_at LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: String(r.company), detail: r.status === "info_requested" ? "Aguardando informações do candidato" : "Nova candidatura", href: `/cms/alliance/candidaturas/${r.id}`, at: date(r.created_at) }),
      ),
    );
  }

  tasks.push(
    add(
      { key: "new_referrals", title: "Indicações novas", hint: "Recebidas e ainda não analisadas. Defina um responsável e a próxima etapa.", href: `/cms/alliance/indicacoes?status=submitted${partnerId ? `&parceiro=${partnerId}` : ""}` },
      sql`SELECT r.id, r.code, r.company_name, r.owner_user_id, r.possible_duplicate_of, r.created_at, p.trade_name, count(*) OVER()::int AS total
          FROM referrals r JOIN partners p ON p.id = r.partner_id
          WHERE r.status = 'submitted' ${byPartner("r.partner_id")} ORDER BY r.created_at LIMIT ${LIMIT}`,
      (r) => ({
        id: String(r.id),
        label: `${r.code} · ${r.company_name}`,
        detail: [partnerId ? null : `de ${r.trade_name}`, r.owner_user_id ? null : "sem responsável", r.possible_duplicate_of ? "possível duplicidade" : null].filter(Boolean).join(" · "),
        href: `/cms/alliance/indicacoes/${r.id}`,
        at: date(r.created_at),
        urgent: Boolean(r.possible_duplicate_of),
      }),
    ),
    add(
      { key: "expiring_referrals", title: "Proteções vencendo", hint: "Indicações em andamento cuja proteção termina em até 7 dias. Avance a etapa ou prorrogue.", href: `/cms/alliance/indicacoes${partnerId ? `?parceiro=${partnerId}` : ""}` },
      sql`SELECT r.id, r.code, r.company_name, r.protected_until, p.trade_name, count(*) OVER()::int AS total
          FROM referrals r JOIN partners p ON p.id = r.partner_id
          WHERE r.status IN ('submitted', 'under_review', 'qualified', 'in_negotiation') AND r.protected_until BETWEEN now() AND now() + interval '7 days'
          ${byPartner("r.partner_id")} ORDER BY r.protected_until LIMIT ${LIMIT}`,
      (r) => ({ id: String(r.id), label: `${r.code} · ${r.company_name}`, detail: `${partnerId ? "" : `${r.trade_name} · `}protegida até ${day(r.protected_until)}`, href: `/cms/alliance/indicacoes/${r.id}`, at: date(r.protected_until), urgent: true }),
    ),
  );

  if (perms.has("alliance.partners")) {
    tasks.push(
      add(
        { key: "change_requests", title: "Pedidos de alteração", hint: "Mudanças de perfil público enviadas pelos parceiros no Hub.", href: "/cms/alliance/parceiros#pedidos" },
        sql`SELECT c.id, c.partner_id, c.created_at, p.trade_name, count(*) OVER()::int AS total
            FROM partner_change_requests c JOIN partners p ON p.id = c.partner_id
            WHERE c.status = 'pending' ${byPartner("c.partner_id")} ORDER BY c.created_at LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: String(r.trade_name), detail: "Alteração do perfil público para aprovar", href: "/cms/alliance/parceiros#pedidos", at: date(r.created_at) }),
      ),
      add(
        { key: "no_hub_access", title: "Parceiros sem acesso ao Hub", hint: "Ativos ou em onboarding sem ninguém com acesso ativo. Convide quem administra a empresa.", href: "/cms/alliance/parceiros" },
        sql`SELECT p.id, p.trade_name, p.status, p.created_at,
              (SELECT count(*) FROM partner_users u WHERE u.partner_id = p.id AND u.status = 'invited')::int AS invited,
              count(*) OVER()::int AS total
            FROM partners p
            WHERE p.status IN ('active', 'onboarding') AND NOT EXISTS (SELECT 1 FROM partner_users u WHERE u.partner_id = p.id AND u.status = 'active')
            ${byPartner("p.id")} ORDER BY p.created_at LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: String(r.trade_name), detail: Number(r.invited) > 0 ? "Convite enviado, ainda não aceito" : "Ninguém convidado ainda", href: `/cms/alliance/parceiros/${r.id}/equipe`, at: date(r.created_at) }),
      ),
    );
  }

  if (perms.has("alliance.finance")) {
    tasks.push(
      add(
        { key: "commissions_pending", title: "Comissões para aprovar", hint: "Lançamentos gerados pelos recebimentos, esperando aprovação.", href: `/cms/alliance/comissoes?status=pending${partnerId ? `&parceiro=${partnerId}` : ""}` },
        sql`SELECT p.id, p.trade_name, sum(e.amount_cents)::bigint AS amount, count(*)::int AS entries, min(e.created_at) AS since, count(*) OVER()::int AS total
            FROM commission_entries e JOIN partners p ON p.id = e.partner_id
            WHERE e.status = 'pending' ${byPartner("e.partner_id")} GROUP BY p.id, p.trade_name ORDER BY min(e.created_at) LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: String(r.trade_name), detail: `${money(Number(r.amount))} em ${Number(r.entries) === 1 ? "1 lançamento" : `${r.entries} lançamentos`}`, href: `/cms/alliance/comissoes?status=pending&parceiro=${r.id}`, at: date(r.since) }),
      ),
      add(
        { key: "commissions_approved", title: "Comissões a pagar", hint: "Aprovadas e ainda sem pagamento registrado.", href: "/cms/alliance/comissoes/pagamentos" },
        sql`SELECT p.id, p.trade_name, sum(e.amount_cents)::bigint AS amount, min(e.approved_at) AS since, count(*) OVER()::int AS total
            FROM commission_entries e JOIN partners p ON p.id = e.partner_id
            WHERE e.status = 'approved' ${byPartner("e.partner_id")} GROUP BY p.id, p.trade_name ORDER BY min(e.approved_at) LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: String(r.trade_name), detail: `${money(Number(r.amount))} aprovado a pagar`, href: "/cms/alliance/comissoes/pagamentos", at: date(r.since) }),
      ),
      add(
        { key: "rules_draft", title: "Regras de comissão em rascunho", hint: "Só valem depois da aprovação comercial.", href: "/cms/alliance/comissoes/regras" },
        sql`SELECT id, name, created_at, count(*) OVER()::int AS total FROM commission_rules
            WHERE status = 'draft' ${partnerId ? sql`AND partner_id = ${partnerId}` : sql``} ORDER BY created_at LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: String(r.name), detail: "Aguardando aprovação comercial", href: "/cms/alliance/comissoes/regras", at: date(r.created_at) }),
      ),
    );
  }

  if (perms.has("alliance.contracts")) {
    tasks.push(
      add(
        { key: "contracts_sent", title: "Contratos aguardando aceite", hint: "Enviados ao parceiro e ainda não aceitos no Hub.", href: `/cms/alliance/contratos${partnerId ? `?parceiro=${partnerId}` : ""}` },
        sql`SELECT c.id, c.title, c.sent_at, p.trade_name, count(*) OVER()::int AS total
            FROM partner_contracts c JOIN partners p ON p.id = c.partner_id
            WHERE c.status = 'sent' ${byPartner("c.partner_id")} ORDER BY c.sent_at LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: String(r.title), detail: partnerId ? `Enviado ${day(r.sent_at)}` : `${r.trade_name} · enviado ${day(r.sent_at)}`, href: `/cms/alliance/contratos/${r.id}`, at: date(r.sent_at) }),
      ),
      add(
        { key: "contracts_expiring", title: "Contratos vencendo", hint: "Vigentes que terminam nos próximos 30 dias.", href: `/cms/alliance/contratos${partnerId ? `?parceiro=${partnerId}` : ""}` },
        sql`SELECT c.id, c.title, c.ends_on, p.trade_name, count(*) OVER()::int AS total
            FROM partner_contracts c JOIN partners p ON p.id = c.partner_id
            WHERE c.status = 'active' AND c.ends_on IS NOT NULL AND c.ends_on <= (now() + interval '30 days')::date
            ${byPartner("c.partner_id")} ORDER BY c.ends_on LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: String(r.title), detail: `${partnerId ? "" : `${r.trade_name} · `}vence em ${day(r.ends_on)}`, href: `/cms/alliance/contratos/${r.id}`, at: date(r.ends_on), urgent: true }),
      ),
    );
  }

  if (perms.has("alliance.communications")) {
    tasks.push(
      add(
        { key: "tickets", title: "Chamados abertos", hint: "Pedidos de suporte dos parceiros esperando resposta da equipe.", href: `/cms/alliance/comunicacoes/suporte${partnerId ? `?parceiro=${partnerId}` : ""}` },
        sql`SELECT t.id, t.code, t.subject, t.last_message_at, p.trade_name, count(*) OVER()::int AS total
            FROM support_tickets t JOIN partners p ON p.id = t.partner_id
            WHERE t.status = 'open' ${byPartner("t.partner_id")} ORDER BY t.last_message_at LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: `${r.code} · ${r.subject}`, detail: partnerId ? "Aguardando resposta" : String(r.trade_name), href: `/cms/alliance/comunicacoes/suporte/${r.id}`, at: date(r.last_message_at) }),
      ),
    );
    if (!partnerId) {
      tasks.push(
        add(
          { key: "emails_failed", title: "E-mails que falharam", hint: "Envios do programa que não chegaram. Confira o endereço e reenvie.", href: "/cms/alliance/comunicacoes/envios?status=failed" },
          sql`SELECT id, template, to_email, updated_at, count(*) OVER()::int AS total FROM alliance_email_log WHERE status = 'failed' ORDER BY updated_at DESC LIMIT ${LIMIT}`,
          (r) => ({ id: String(r.id), label: String(r.to_email), detail: "Falha no envio", href: "/cms/alliance/comunicacoes/envios?status=failed", at: date(r.updated_at) }),
        ),
      );
    }
  }

  if (perms.has("alliance.resources")) {
    tasks.push(
      add(
        { key: "interests", title: "Interesses em oportunidades", hint: "Parceiros que pediram para participar de uma oportunidade.", href: "/cms/alliance/recursos/oportunidades" },
        sql`SELECT i.id, i.opportunity_id, i.created_at, o.title, p.trade_name, count(*) OVER()::int AS total
            FROM opportunity_interests i JOIN opportunities o ON o.id = i.opportunity_id JOIN partners p ON p.id = i.partner_id
            WHERE i.status = 'sent' ${byPartner("i.partner_id")} ORDER BY i.created_at LIMIT ${LIMIT}`,
        (r) => ({ id: String(r.id), label: String(r.title), detail: partnerId ? "Interesse para responder" : String(r.trade_name), href: `/cms/alliance/recursos/oportunidades/${r.opportunity_id}`, at: date(r.created_at) }),
      ),
    );
  }

  await Promise.all(tasks);
  const order = ["applications", "new_referrals", "expiring_referrals", "tickets", "contracts_sent", "commissions_pending", "commissions_approved", "rules_draft", "change_requests", "interests", "no_hub_access", "contracts_expiring", "emails_failed"];
  return groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

/* -------------------------------------------------------------------------- */
/* Ficha do parceiro                                                           */
/* -------------------------------------------------------------------------- */

export async function partnerSummary(partnerId: string, perms: Perms) {
  const db = getDb();
  const stats = (
    await db.execute<{
      open: number;
      won: number;
      lost: number;
      total: number;
      last_referral: string | null;
      won_value: string;
      active_users: number;
      invited_users: number;
      last_login: string | null;
    }>(sql`
      SELECT
        (SELECT count(*) FROM referrals WHERE partner_id = ${partnerId} AND status IN ('submitted', 'under_review', 'qualified', 'in_negotiation'))::int AS open,
        (SELECT count(*) FROM referrals WHERE partner_id = ${partnerId} AND status = 'won')::int AS won,
        (SELECT count(*) FROM referrals WHERE partner_id = ${partnerId} AND status = 'lost')::int AS lost,
        (SELECT count(*) FROM referrals WHERE partner_id = ${partnerId})::int AS total,
        (SELECT max(created_at) FROM referrals WHERE partner_id = ${partnerId}) AS last_referral,
        coalesce((SELECT sum(deal_value_cents) FROM referrals WHERE partner_id = ${partnerId} AND status = 'won'), 0)::bigint AS won_value,
        (SELECT count(*) FROM partner_users WHERE partner_id = ${partnerId} AND status = 'active')::int AS active_users,
        (SELECT count(*) FROM partner_users WHERE partner_id = ${partnerId} AND status = 'invited')::int AS invited_users,
        (SELECT max(last_login_at) FROM partner_users WHERE partner_id = ${partnerId}) AS last_login`)
  ).rows[0];

  const referrals = (
    await db.execute<{ id: string; code: string; company_name: string; status: string; created_at: string; owner_name: string | null }>(sql`
      SELECT r.id, r.code, r.company_name, r.status, r.created_at, u.name AS owner_name
      FROM referrals r LEFT JOIN users u ON u.id = r.owner_user_id
      WHERE r.partner_id = ${partnerId} ORDER BY r.created_at DESC LIMIT 6`)
  ).rows.map((r) => ({ id: r.id, code: r.code, companyName: r.company_name, status: r.status, createdAt: new Date(r.created_at), ownerName: r.owner_name }));

  let finance: { pendingCents: number; approvedCents: number; paidCents: number; lastPayoutOn: string | null } | null = null;
  if (perms.has("alliance.finance")) {
    const f = (
      await db.execute<{ pending: string; approved: string; paid: string; last_payout: string | null }>(sql`
        SELECT
          coalesce(sum(amount_cents) FILTER (WHERE status = 'pending'), 0)::bigint AS pending,
          coalesce(sum(amount_cents) FILTER (WHERE status = 'approved'), 0)::bigint AS approved,
          coalesce(sum(amount_cents) FILTER (WHERE status = 'paid'), 0)::bigint AS paid,
          (SELECT max(paid_on)::text FROM partner_payouts WHERE partner_id = ${partnerId} AND status = 'registered') AS last_payout
        FROM commission_entries WHERE partner_id = ${partnerId}`)
    ).rows[0];
    finance = { pendingCents: Number(f.pending), approvedCents: Number(f.approved), paidCents: Number(f.paid), lastPayoutOn: f.last_payout };
  }

  const contracts = perms.has("alliance.contracts")
    ? (
        await db.execute<{ id: string; title: string; status: string; ends_on: string | null; accepted_at: string | null }>(sql`
          SELECT id, title, status, ends_on::text, accepted_at FROM partner_contracts WHERE partner_id = ${partnerId}
          ORDER BY CASE status WHEN 'sent' THEN 0 WHEN 'active' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END, created_at DESC LIMIT 4`)
      ).rows.map((c) => ({ id: c.id, title: c.title, status: c.status, endsOn: c.ends_on, acceptedAt: c.accepted_at ? new Date(c.accepted_at) : null }))
    : null;

  // Atividade do parceiro e de tudo o que é dele (indicações, contratos, pagamentos, chamados, equipe).
  const activity = (
    await db.execute<{ id: number; summary: string; actor_email: string | null; created_at: string }>(sql`
      SELECT id, summary, actor_email, created_at FROM audit_logs
      WHERE action LIKE 'alliance.%' AND (
        (resource_type = 'partner' AND resource_id = ${partnerId})
        OR resource_id IN (
          SELECT id::text FROM referrals WHERE partner_id = ${partnerId}
          UNION ALL SELECT id::text FROM partner_contracts WHERE partner_id = ${partnerId}
          UNION ALL SELECT id::text FROM partner_payouts WHERE partner_id = ${partnerId}
          UNION ALL SELECT id::text FROM support_tickets WHERE partner_id = ${partnerId}
          UNION ALL SELECT id::text FROM partner_users WHERE partner_id = ${partnerId}
        )
      )
      ORDER BY id DESC LIMIT 10`)
  ).rows.map((a) => ({ id: a.id, summary: a.summary, actorEmail: a.actor_email, createdAt: new Date(a.created_at) }));

  const closed = stats.won + stats.lost;
  return {
    referrals: {
      open: stats.open,
      won: stats.won,
      lost: stats.lost,
      total: stats.total,
      conversion: closed > 0 ? stats.won / closed : null,
      wonValueCents: Number(stats.won_value),
      lastAt: stats.last_referral ? new Date(stats.last_referral) : null,
      recent: referrals,
    },
    hub: { activeUsers: stats.active_users, invitedUsers: stats.invited_users, lastLoginAt: stats.last_login ? new Date(stats.last_login) : null },
    finance,
    contracts,
    activity,
  };
}
