import "server-only";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { log } from "@/server/log";

/** Contadores das abas (itens esperando alguém da equipe). Falha do banco não derruba o layout. */
export async function allianceBadges() {
  try {
    const result = await getDb().execute<{ applications: number; referrals: number; tickets: number; change_requests: number }>(sql`
      SELECT
        (SELECT count(*) FROM partner_applications WHERE status = 'pending_review')::int AS applications,
        (SELECT count(*) FROM referrals WHERE status = 'submitted')::int AS referrals,
        (SELECT count(*) FROM support_tickets WHERE status = 'open')::int AS tickets,
        (SELECT count(*) FROM partner_change_requests WHERE status = 'pending')::int AS change_requests`);
    const r = result.rows[0];
    return { applications: r.applications, referrals: r.referrals, tickets: r.tickets, changeRequests: r.change_requests };
  } catch (error) {
    log.error("alliance.badges_failed", { error });
    return { applications: 0, referrals: 0, tickets: 0, changeRequests: 0 };
  }
}

/**
 * Indicadores da visão geral. Valores financeiros só são calculados para quem pode vê-los
 * (a consulta nem roda sem a permissão).
 */
export async function getOverview(options: { finance: boolean }) {
  const db = getDb();
  const counts = (
    await db.execute<{
      partners_active: number;
      partners_onboarding: number;
      partners_published: number;
      applications_pending: number;
      applications_total: number;
      referrals_open: number;
      referrals_won: number;
      referrals_lost: number;
      referrals_total: number;
      referrals_new: number;
      opportunities_open: number;
      interests_new: number;
      tickets_open: number;
      change_requests: number;
      emails_failed: number;
      hub_users: number;
    }>(sql`
      SELECT
        (SELECT count(*) FROM partners WHERE status = 'active')::int AS partners_active,
        (SELECT count(*) FROM partners WHERE status = 'onboarding')::int AS partners_onboarding,
        (SELECT count(*) FROM partners WHERE published_snapshot IS NOT NULL AND directory_enabled)::int AS partners_published,
        (SELECT count(*) FROM partner_applications WHERE status IN ('pending_review', 'info_requested'))::int AS applications_pending,
        (SELECT count(*) FROM partner_applications)::int AS applications_total,
        (SELECT count(*) FROM referrals WHERE status IN ('submitted', 'under_review', 'qualified', 'in_negotiation'))::int AS referrals_open,
        (SELECT count(*) FROM referrals WHERE status = 'won')::int AS referrals_won,
        (SELECT count(*) FROM referrals WHERE status = 'lost')::int AS referrals_lost,
        (SELECT count(*) FROM referrals)::int AS referrals_total,
        (SELECT count(*) FROM referrals WHERE status = 'submitted')::int AS referrals_new,
        (SELECT count(*) FROM opportunities WHERE status = 'open')::int AS opportunities_open,
        (SELECT count(*) FROM opportunity_interests WHERE status = 'sent')::int AS interests_new,
        (SELECT count(*) FROM support_tickets WHERE status = 'open')::int AS tickets_open,
        (SELECT count(*) FROM partner_change_requests WHERE status = 'pending')::int AS change_requests,
        (SELECT count(*) FROM alliance_email_log WHERE status = 'failed')::int AS emails_failed,
        (SELECT count(*) FROM partner_users WHERE status = 'active')::int AS hub_users`)
  ).rows[0];

  let finance: { pendingCents: number; approvedCents: number; paidYearCents: number; payoutsYear: number; rulesDraft: number; receivedYearCents: number } | null = null;
  if (options.finance) {
    const f = (
      await db.execute<{ pending: string; approved: string; paid_year: string; payouts_year: number; rules_draft: number; received_year: string }>(sql`
        SELECT
          coalesce((SELECT sum(amount_cents) FROM commission_entries WHERE status = 'pending'), 0)::bigint AS pending,
          coalesce((SELECT sum(amount_cents) FROM commission_entries WHERE status = 'approved'), 0)::bigint AS approved,
          coalesce((SELECT sum(amount_cents) FROM partner_payouts WHERE status = 'registered' AND paid_on >= date_trunc('year', now())::date), 0)::bigint AS paid_year,
          (SELECT count(*) FROM partner_payouts WHERE status = 'registered' AND paid_on >= date_trunc('year', now())::date)::int AS payouts_year,
          (SELECT count(*) FROM commission_rules WHERE status = 'draft')::int AS rules_draft,
          coalesce((SELECT sum(CASE WHEN kind = 'refund' THEN -amount_cents ELSE amount_cents END) FROM revenue_receipts WHERE received_on >= date_trunc('year', now())::date), 0)::bigint AS received_year`)
    ).rows[0];
    finance = {
      pendingCents: Number(f.pending),
      approvedCents: Number(f.approved),
      paidYearCents: Number(f.paid_year),
      payoutsYear: f.payouts_year,
      rulesDraft: f.rules_draft,
      receivedYearCents: Number(f.received_year),
    };
  }

  const activity = await db
    .select({ id: schema.auditLogs.id, summary: schema.auditLogs.summary, actorEmail: schema.auditLogs.actorEmail, createdAt: schema.auditLogs.createdAt })
    .from(schema.auditLogs)
    .where(like(schema.auditLogs.action, "alliance.%"))
    .orderBy(desc(schema.auditLogs.id))
    .limit(8);

  const closed = counts.referrals_won + counts.referrals_lost;
  return { counts, conversion: closed > 0 ? counts.referrals_won / closed : null, finance, activity };
}

/** Pessoas ativas do CMS com uma permissão do programa (para escolher responsáveis). */
export async function teamWithPermission(permission: string) {
  return getDb()
    .selectDistinct({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .innerJoin(schema.rolePermissions, eq(schema.rolePermissions.roleId, schema.users.roleId))
    .where(and(eq(schema.users.status, "active"), eq(schema.rolePermissions.permissionKey, permission)))
    .orderBy(asc(schema.users.name));
}
