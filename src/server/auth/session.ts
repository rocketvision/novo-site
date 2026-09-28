import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, eq, gt, lt, ne, sql } from "drizzle-orm";
import { generateToken, hashToken } from "./tokens";
import { getDb, schema } from "@/server/db";
import { isProduction } from "@/server/env";
import { isPermission, type Permission } from "@/server/authz/permissions";

/**
 * Sessões no banco, no padrão descrito no Copenhagen Book (base do Lucia):
 * - o cookie carrega um token aleatório de 160 bits;
 * - o banco guarda apenas o SHA-256 do token (vazamento do banco não permite sequestrar sessões);
 * - login sempre gera um token novo (sem session fixation);
 * - expiração deslizante de 7 dias, com teto absoluto de 30 dias desde o login.
 */

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

/** Em produção o prefixo __Host- obriga Secure, Path=/ e proíbe Domain: o cookie fica preso ao host exato. */
export const SESSION_COOKIE = isProduction ? "__Host-rv_session" : "rv_session";

export { generateToken, hashToken };

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  permissions: ReadonlySet<Permission>;
};

export type ValidSession = { id: string; expiresAt: Date; user: SessionUser };

export async function createSession(userId: string, context: { ip: string | null; userAgent: string | null }) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getDb()
    .insert(schema.sessions)
    .values({ id: hashToken(token), userId, expiresAt, ipAddress: context.ip, userAgent: context.userAgent });
  return { token, expiresAt };
}

/** Valida o token e carrega usuário, função e permissões em uma única consulta. */
export async function validateSessionToken(token: string): Promise<ValidSession | null> {
  if (!/^[a-z2-7]{32}$/.test(token)) return null;
  const db = getDb();
  const id = hashToken(token);

  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      expiresAt: schema.sessions.expiresAt,
      createdAt: schema.sessions.createdAt,
      lastSeenAt: schema.sessions.lastSeenAt,
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      status: schema.users.status,
      roleId: schema.roles.id,
      roleKey: schema.roles.key,
      roleName: schema.roles.name,
      permissions: sql<string[]>`coalesce(array_agg(${schema.rolePermissions.permissionKey}) filter (where ${schema.rolePermissions.permissionKey} is not null), '{}')`,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .leftJoin(schema.rolePermissions, eq(schema.rolePermissions.roleId, schema.roles.id))
    .where(eq(schema.sessions.id, id))
    .groupBy(schema.sessions.id, schema.users.id, schema.roles.id);

  const row = rows[0];
  if (!row) return null;

  const now = Date.now();
  const expired = row.expiresAt.getTime() <= now || row.createdAt.getTime() + SESSION_MAX_AGE_MS <= now;
  if (expired || row.status !== "active") {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }

  // Renovação deslizante (no máximo até o teto absoluto) e registro de atividade com moderação de escrita.
  let expiresAt = row.expiresAt;
  const renew = row.expiresAt.getTime() - now < SESSION_TTL_MS / 2;
  const touch = now - row.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS;
  if (renew || touch) {
    if (renew) expiresAt = new Date(Math.min(now + SESSION_TTL_MS, row.createdAt.getTime() + SESSION_MAX_AGE_MS));
    await db
      .update(schema.sessions)
      .set({ expiresAt, lastSeenAt: new Date(now) })
      .where(eq(schema.sessions.id, id));
  }

  return {
    id,
    expiresAt,
    user: {
      id: row.userId,
      email: row.email,
      name: row.name,
      roleId: row.roleId,
      roleKey: row.roleKey,
      roleName: row.roleName,
      permissions: new Set(row.permissions.filter(isPermission)),
    },
  };
}

export async function invalidateSession(sessionId: string) {
  await getDb().delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

/** Encerra todas as sessões do usuário, opcionalmente mantendo a atual. */
export async function invalidateUserSessions(userId: string, exceptSessionId?: string) {
  const where = exceptSessionId
    ? and(eq(schema.sessions.userId, userId), ne(schema.sessions.id, exceptSessionId))
    : eq(schema.sessions.userId, userId);
  const deleted = await getDb().delete(schema.sessions).where(where).returning({ id: schema.sessions.id });
  return deleted.length;
}

export async function deleteExpiredSessions() {
  await getDb().delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

export async function countActiveSessions(userId: string) {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), gt(schema.sessions.expiresAt, new Date())));
  return row?.count ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Cookie                                                                       */
/* -------------------------------------------------------------------------- */

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: 0 });
}

/**
 * Sessão da requisição atual. `cache` garante uma única consulta por requisição,
 * mesmo que layout, página e componentes perguntem várias vezes.
 */
export const getSession = cache(async (): Promise<ValidSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

/* -------------------------------------------------------------------------- */
/* Contexto da requisição                                                       */
/* -------------------------------------------------------------------------- */

export function clientIpFrom(h: Headers) {
  // Na Vercel, x-real-ip e o primeiro item de x-forwarded-for são definidos pela própria plataforma.
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip && ip.length <= 64 ? ip : null;
}

export async function requestContext() {
  const h = await headers();
  return { ip: clientIpFrom(h), userAgent: h.get("user-agent")?.slice(0, 256) ?? null };
}
