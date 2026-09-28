import "server-only";
import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { notFound } from "@/server/http/errors";

type Ctx = { ip: string | null; userAgent: string | null };
type Actor = { id: string; email: string };

/**
 * O id da sessão é o hash do token. Para a interface usamos só um prefixo dele:
 * suficiente para identificar a sessão dentro das sessões do próprio usuário.
 */
const PUBLIC_ID_LENGTH = 16;
export const publicSessionId = (id: string) => id.slice(0, PUBLIC_ID_LENGTH);

export async function listOwnSessions(userId: string, currentSessionId: string) {
  const rows = await getDb()
    .select({
      id: schema.sessions.id,
      createdAt: schema.sessions.createdAt,
      lastSeenAt: schema.sessions.lastSeenAt,
      ipAddress: schema.sessions.ipAddress,
      userAgent: schema.sessions.userAgent,
    })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), gt(schema.sessions.expiresAt, new Date())))
    .orderBy(desc(schema.sessions.lastSeenAt));
  return rows.map(({ id, ...rest }) => ({ ...rest, id: publicSessionId(id), current: id === currentSessionId }));
}

/** Encerra uma sessão do próprio usuário (nunca de outra pessoa: o filtro por user_id garante). */
export async function revokeOwnSession(actor: Actor, publicId: string, currentSessionId: string, ctx: Ctx) {
  if (!/^[0-9a-f]{16}$/.test(publicId) || publicId === publicSessionId(currentSessionId)) throw notFound("Sessão não encontrada.");
  const deleted = await getDb()
    .delete(schema.sessions)
    .where(
      and(
        eq(schema.sessions.userId, actor.id),
        ne(schema.sessions.id, currentSessionId),
        sql`left(${schema.sessions.id}, ${PUBLIC_ID_LENGTH}) = ${publicId}`,
      ),
    )
    .returning({ id: schema.sessions.id });
  if (deleted.length === 0) throw notFound("Sessão não encontrada.");
  await audit({ actor, action: "auth.session_revoked", resourceType: "user", resourceId: actor.id, summary: "Encerrou uma sessão em outro dispositivo", ...ctx });
}

export async function revokeOtherSessions(actor: Actor, currentSessionId: string, ctx: Ctx) {
  const deleted = await getDb()
    .delete(schema.sessions)
    .where(and(eq(schema.sessions.userId, actor.id), ne(schema.sessions.id, currentSessionId)))
    .returning({ id: schema.sessions.id });
  if (deleted.length > 0) {
    await audit({
      actor,
      action: "auth.sessions_revoked",
      resourceType: "user",
      resourceId: actor.id,
      summary: `Encerrou ${deleted.length} ${deleted.length === 1 ? "sessão" : "sessões"} em outros dispositivos`,
      ...ctx,
    });
  }
  return deleted.length;
}

export async function updateOwnProfile(actor: Actor, input: { name: string }, ctx: Ctx) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, actor.id)).for("update");
    if (!before) throw notFound();
    if (before.name === input.name) return;
    await tx
      .update(schema.users)
      .set({ name: input.name, updatedAt: new Date(), version: sql`${schema.users.version} + 1` })
      .where(eq(schema.users.id, actor.id));
    await audit(
      {
        actor,
        action: "user.profile_updated",
        resourceType: "user",
        resourceId: actor.id,
        summary: "Atualizou o próprio nome",
        changes: { name: { before: before.name, after: input.name } },
        ...ctx,
      },
      tx,
    );
  });
}
