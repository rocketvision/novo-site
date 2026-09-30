import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { getDb, schema } from "@/server/db";
import { isProduction } from "@/server/env";
import { HUB_OPEN_STATUSES, type PartnerRole, type PartnerStatus } from "@/lib/alliance/constants";

/**
 * Sessões do Alliance Hub. Mesmo desenho das sessões do CMS (token de 160 bits no cookie, só o
 * SHA-256 no banco, expiração deslizante de 7 dias com teto de 30), mas em tabela e cookie próprios:
 * uma sessão do Hub nunca vale no CMS e uma sessão do CMS nunca vale no Hub.
 *
 * Toda validação confere de novo a pessoa (ativa) e a empresa (em onboarding ou ativa): suspender a
 * empresa ou desativar a pessoa derruba o acesso na próxima requisição.
 */

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

export const HUB_COOKIE = isProduction ? "__Host-rv_partner" : "rv_partner";

export type HubUser = {
  id: string;
  email: string;
  name: string;
  role: PartnerRole;
  totpEnabled: boolean;
  partner: { id: string; slug: string; tradeName: string; status: PartnerStatus; tierKey: string; managersInvite: boolean };
};
export type HubSession = { id: string; expiresAt: Date; user: HubUser };

export async function createHubSession(partnerUserId: string, ctx: { ip: string | null; userAgent: string | null }) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getDb().insert(schema.partnerSessions).values({ id: hashToken(token), partnerUserId, expiresAt, ipAddress: ctx.ip, userAgent: ctx.userAgent });
  return { token, expiresAt };
}

export async function validateHubToken(token: string): Promise<HubSession | null> {
  if (!/^[a-z2-7]{32}$/.test(token)) return null;
  const db = getDb();
  const id = hashToken(token);
  const [row] = await db
    .select({
      expiresAt: schema.partnerSessions.expiresAt,
      createdAt: schema.partnerSessions.createdAt,
      lastSeenAt: schema.partnerSessions.lastSeenAt,
      userId: schema.partnerUsers.id,
      email: schema.partnerUsers.email,
      name: schema.partnerUsers.name,
      role: schema.partnerUsers.role,
      status: schema.partnerUsers.status,
      totpEnabledAt: schema.partnerUsers.totpEnabledAt,
      partnerId: schema.partners.id,
      slug: schema.partners.slug,
      tradeName: schema.partners.tradeName,
      partnerStatus: schema.partners.status,
      tierKey: schema.partners.tierKey,
      managersInvite: schema.partners.managersInvite,
    })
    .from(schema.partnerSessions)
    .innerJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.partnerSessions.partnerUserId))
    .innerJoin(schema.partners, eq(schema.partners.id, schema.partnerUsers.partnerId))
    .where(eq(schema.partnerSessions.id, id));
  if (!row) return null;

  const now = Date.now();
  const expired = row.expiresAt.getTime() <= now || row.createdAt.getTime() + SESSION_MAX_AGE_MS <= now;
  if (expired || row.status !== "active" || !HUB_OPEN_STATUSES.includes(row.partnerStatus as PartnerStatus)) {
    await db.delete(schema.partnerSessions).where(eq(schema.partnerSessions.id, id));
    return null;
  }

  let expiresAt = row.expiresAt;
  const renew = row.expiresAt.getTime() - now < SESSION_TTL_MS / 2;
  const touch = now - row.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS;
  if (renew || touch) {
    if (renew) expiresAt = new Date(Math.min(now + SESSION_TTL_MS, row.createdAt.getTime() + SESSION_MAX_AGE_MS));
    await db.update(schema.partnerSessions).set({ expiresAt, lastSeenAt: new Date(now) }).where(eq(schema.partnerSessions.id, id));
  }

  return {
    id,
    expiresAt,
    user: {
      id: row.userId,
      email: row.email,
      name: row.name,
      role: row.role as PartnerRole,
      totpEnabled: row.totpEnabledAt !== null,
      partner: { id: row.partnerId, slug: row.slug, tradeName: row.tradeName, status: row.partnerStatus as PartnerStatus, tierKey: row.tierKey, managersInvite: row.managersInvite },
    },
  };
}

export async function invalidateHubSession(sessionId: string) {
  await getDb().delete(schema.partnerSessions).where(eq(schema.partnerSessions.id, sessionId));
}

export async function invalidateHubUserSessions(partnerUserId: string, exceptSessionId?: string) {
  const where = exceptSessionId
    ? and(eq(schema.partnerSessions.partnerUserId, partnerUserId), ne(schema.partnerSessions.id, exceptSessionId))
    : eq(schema.partnerSessions.partnerUserId, partnerUserId);
  return (await getDb().delete(schema.partnerSessions).where(where).returning({ id: schema.partnerSessions.id })).length;
}

export async function listHubSessions(partnerUserId: string) {
  return getDb()
    .select({ id: schema.partnerSessions.id, createdAt: schema.partnerSessions.createdAt, lastSeenAt: schema.partnerSessions.lastSeenAt, ipAddress: schema.partnerSessions.ipAddress, userAgent: schema.partnerSessions.userAgent })
    .from(schema.partnerSessions)
    .where(and(eq(schema.partnerSessions.partnerUserId, partnerUserId), gt(schema.partnerSessions.expiresAt, new Date())));
}

export async function deleteExpiredHubSessions() {
  await getDb().delete(schema.partnerSessions).where(lt(schema.partnerSessions.expiresAt, new Date()));
}

export async function setHubCookie(token: string, expiresAt: Date) {
  (await cookies()).set(HUB_COOKIE, token, { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function deleteHubCookie() {
  (await cookies()).set(HUB_COOKIE, "", { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: 0 });
}

/** Sessão do Hub da requisição atual (uma consulta por requisição). */
export const getHubSession = cache(async (): Promise<HubSession | null> => {
  const token = (await cookies()).get(HUB_COOKIE)?.value;
  if (!token) return null;
  return validateHubToken(token);
});
