import "server-only";
import { desc, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";

/**
 * Dados da visão geral. `onlyActorId`: quem não pode ver a auditoria vê só as próprias ações na atividade recente
 * (a auditoria completa tem e-mails e ações de outras pessoas).
 */
export async function getDashboard(options: { onlyActorId?: string } = {}) {
  const db = getDb();
  const activityFilter = options.onlyActorId
    ? sql`${schema.auditLogs.action} NOT IN ('auth.login', 'auth.logout', 'auth.login_failed') AND ${schema.auditLogs.actorId} = ${options.onlyActorId}`
    : sql`${schema.auditLogs.action} NOT IN ('auth.login', 'auth.logout', 'auth.login_failed')`;

  const [projectCounts, pendingSections, pendingProjects, activity] = await Promise.all([
    db
      .select({ status: schema.projects.status, count: sql<number>`count(*)::int` })
      .from(schema.projects)
      .groupBy(schema.projects.status),
    db
      .select({ key: schema.contentSections.key, draftUpdatedAt: schema.contentSections.draftUpdatedAt })
      .from(schema.contentSections)
      .where(sql`${schema.contentSections.published} IS DISTINCT FROM ${schema.contentSections.draft}`),
    db
      .select({ id: schema.projects.id, name: schema.projects.name, status: schema.projects.status, updatedAt: schema.projects.updatedAt })
      .from(schema.projects)
      .where(
        sql`${schema.projects.status} = 'draft' OR (${schema.projects.status} = 'published' AND ${schema.projects.updatedAt} > ${schema.projects.publishedAt})`,
      )
      .orderBy(desc(schema.projects.updatedAt))
      .limit(6),
    db
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        summary: schema.auditLogs.summary,
        actorEmail: schema.auditLogs.actorEmail,
        actorName: schema.users.name,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.users, sql`${schema.users.id} = ${schema.auditLogs.actorId}`)
      .where(activityFilter)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(8),
  ]);

  const counts = { draft: 0, published: 0, archived: 0 };
  for (const row of projectCounts) counts[row.status] = row.count;

  return { counts, pendingSections, pendingProjects, activity };
}
