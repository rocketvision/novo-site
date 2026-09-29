import "server-only";
import { and, desc, eq, gte, like, lt, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/server/db";

/** Categorias de filtro: prefixo da ação registrada. */
export const AUDIT_CATEGORIES = {
  auth: { label: "Acesso", prefix: "auth." },
  section: { label: "Landing e configurações", prefix: "section." },
  project: { label: "Projetos", prefix: "project." },
  media: { label: "Mídia", prefix: "media." },
  user: { label: "Usuários", prefix: "user." },
  role: { label: "Funções", prefix: "role." },
  blog: { label: "Blog", prefix: "blog." },
} as const;

export type AuditCategory = keyof typeof AUDIT_CATEGORIES;
export const AUDIT_PAGE_SIZE = 50;

/**
 * Consulta paginada por cursor (id decrescente): estável mesmo com eventos novos chegando.
 * Período em dias do calendário de São Paulo, convertido para UTC.
 */
export async function queryAudit(input: { category?: AuditCategory; actorId?: string; from?: string; to?: string; before?: number }) {
  const where: SQL[] = [];
  if (input.category) {
    const prefix = AUDIT_CATEGORIES[input.category].prefix;
    // Eventos do tipo user.* também incluem a conta própria (perfil) e o bootstrap.
    where.push(like(schema.auditLogs.action, `${prefix}%`));
  }
  if (input.actorId) where.push(eq(schema.auditLogs.actorId, input.actorId));
  if (input.from) where.push(gte(schema.auditLogs.createdAt, new Date(`${input.from}T00:00:00-03:00`)));
  if (input.to) where.push(lt(schema.auditLogs.createdAt, new Date(new Date(`${input.to}T00:00:00-03:00`).getTime() + 86_400_000)));
  if (input.before) where.push(lt(schema.auditLogs.id, input.before));

  const rows = await getDb()
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      summary: schema.auditLogs.summary,
      resourceType: schema.auditLogs.resourceType,
      resourceId: schema.auditLogs.resourceId,
      changes: schema.auditLogs.changes,
      ipAddress: schema.auditLogs.ipAddress,
      userAgent: schema.auditLogs.userAgent,
      createdAt: schema.auditLogs.createdAt,
      actorEmail: schema.auditLogs.actorEmail,
      actorName: schema.users.name,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.actorId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.auditLogs.id))
    .limit(AUDIT_PAGE_SIZE + 1);

  const items = rows.slice(0, AUDIT_PAGE_SIZE);
  return { items, nextBefore: rows.length > AUDIT_PAGE_SIZE ? items.at(-1)!.id : null };
}

export async function auditActors() {
  return getDb()
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .orderBy(schema.users.name);
}

