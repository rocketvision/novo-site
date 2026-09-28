import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, schema, type Tx } from "@/server/db";
import { audit } from "@/server/audit";
import { cmsOrigin } from "@/server/env";
import { log } from "@/server/log";
import { sendMail } from "@/server/mail";
import { selfResetMail } from "@/server/mail-templates";
import { HttpError, unauthorized } from "@/server/http/errors";
import { enforce, hashIdentifier, POLICIES } from "@/server/security/rate-limit";
import { getDummyHash, hashPassword, needsRehash, verifyPassword } from "./password";
import { createSession, generateToken, hashToken, invalidateUserSessions } from "./session";

type RequestCtx = { ip: string | null; userAgent: string | null };

const INVALID_CREDENTIALS = "E-mail ou senha incorretos.";
export const TOKEN_TTL = { invite: 7 * 24 * 60 * 60 * 1000, password_reset: 60 * 60 * 1000 } as const;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Login                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Autentica e cria uma sessão nova.
 * - Mesmo erro e o mesmo custo de tempo para e-mail inexistente, senha errada ou conta inativa
 *   (sem enumeração de usuários).
 * - Limites por IP e por e-mail contra força bruta e credential stuffing.
 */
export async function login(input: { email: string; password: string }, ctx: RequestCtx) {
  const email = normalizeEmail(input.email);
  await enforce(POLICIES.loginByIp, ctx.ip ?? "unknown");
  await enforce(POLICIES.loginByEmail, hashIdentifier(email));

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: sql`lower(${schema.users.email}) = ${email}`,
    columns: { id: true, email: true, passwordHash: true, status: true },
  });

  const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), input.password);

  if (!user || !valid || user.status !== "active" || !user.passwordHash) {
    if (user) {
      await audit({
        actor: { id: user.id, email: user.email },
        action: "auth.login_failed",
        resourceType: "user",
        resourceId: user.id,
        summary: user.status === "active" ? "Tentativa de login com senha incorreta" : "Tentativa de login em conta inativa",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
    throw unauthorized(INVALID_CREDENTIALS);
  }

  // Parâmetros de hash evoluíram desde a última troca de senha: atualiza de forma transparente.
  if (needsRehash(user.passwordHash)) {
    await db.update(schema.users).set({ passwordHash: await hashPassword(input.password) }).where(eq(schema.users.id, user.id));
  }

  const session = await createSession(user.id, ctx);
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  await audit({
    actor: { id: user.id, email: user.email },
    action: "auth.login",
    resourceType: "user",
    resourceId: user.id,
    summary: "Login",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
  return session;
}

/* -------------------------------------------------------------------------- */
/* Tokens de uso único                                                          */
/* -------------------------------------------------------------------------- */

type TokenType = keyof typeof TOKEN_TTL;

/** Emite um token novo e invalida os anteriores ainda não usados do mesmo tipo. */
export async function issueToken(tx: Tx, userId: string, type: TokenType, createdBy: string | null) {
  await tx
    .update(schema.userTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.userTokens.userId, userId), eq(schema.userTokens.type, type), isNull(schema.userTokens.usedAt)));

  const token = generateToken(32);
  await tx.insert(schema.userTokens).values({
    id: hashToken(token),
    userId,
    type,
    expiresAt: new Date(Date.now() + TOKEN_TTL[type]),
    createdBy,
  });
  return token;
}

export function tokenUrl(type: TokenType, token: string) {
  const path = type === "invite" ? "/cms/convite" : "/cms/redefinir-senha";
  return `${cmsOrigin}${path}/${token}`;
}

/** Consulta um token sem consumi-lo (para decidir se mostra o formulário ou "link expirado"). */
export async function peekToken(token: string, type: TokenType) {
  if (!/^[a-z2-7]{52}$/.test(token)) return null;
  const db = getDb();
  const [row] = await db
    .select({ userId: schema.users.id, email: schema.users.email, name: schema.users.name, status: schema.users.status })
    .from(schema.userTokens)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTokens.userId))
    .where(
      and(
        eq(schema.userTokens.id, hashToken(token)),
        eq(schema.userTokens.type, type),
        isNull(schema.userTokens.usedAt),
        gt(schema.userTokens.expiresAt, new Date()),
      ),
    );
  if (!row || row.status === "disabled") return null;
  return row;
}

/**
 * Consome o token e define a senha, tudo em uma transação:
 * o token vira usado (não serve de novo), a senha é trocada, o convite vira conta ativa
 * e todas as sessões anteriores do usuário são encerradas.
 */
export async function consumeToken(input: { token: string; password: string }, type: TokenType, ctx: RequestCtx) {
  await enforce(POLICIES.tokenSubmitByIp, ctx.ip ?? "unknown");
  if (!/^[a-z2-7]{52}$/.test(input.token)) throw expiredLink();

  const passwordHash = await hashPassword(input.password);
  const db = getDb();

  const user = await db.transaction(async (tx) => {
    // UPDATE condicional: só um pedido concorrente consegue marcar o token como usado.
    const [consumed] = await tx
      .update(schema.userTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(schema.userTokens.id, hashToken(input.token)),
          eq(schema.userTokens.type, type),
          isNull(schema.userTokens.usedAt),
          gt(schema.userTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: schema.userTokens.userId });
    if (!consumed) throw expiredLink();

    const current = await tx.query.users.findFirst({ where: eq(schema.users.id, consumed.userId) });
    if (!current || current.status === "disabled") throw expiredLink();

    const [updated] = await tx
      .update(schema.users)
      .set({
        passwordHash,
        passwordChangedAt: new Date(),
        status: "active",
        updatedAt: new Date(),
        version: sql`${schema.users.version} + 1`,
      })
      .where(eq(schema.users.id, consumed.userId))
      .returning({ id: schema.users.id, email: schema.users.email });

    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, updated.id));
    await audit(
      {
        actor: { id: updated.id, email: updated.email },
        action: type === "invite" ? "auth.invite_accepted" : "auth.password_reset",
        resourceType: "user",
        resourceId: updated.id,
        summary: type === "invite" ? "Convite aceito e senha definida" : "Senha redefinida por link",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
      tx,
    );
    return updated;
  });

  return user;
}

function expiredLink() {
  return new HttpError(410, "link_expired", "Este link expirou ou já foi usado. Peça um novo.");
}

/* -------------------------------------------------------------------------- */
/* Esqueci minha senha                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Sempre responde da mesma forma, exista o e-mail ou não (sem enumeração).
 * Só envia o link para contas ativas.
 */
export async function requestPasswordReset(emailInput: string, ctx: RequestCtx) {
  const email = normalizeEmail(emailInput);
  await enforce(POLICIES.resetRequestByIp, ctx.ip ?? "unknown");
  await enforce(POLICIES.resetRequestByEmail, hashIdentifier(email));

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: sql`lower(${schema.users.email}) = ${email}`,
    columns: { id: true, email: true, name: true, status: true },
  });
  if (!user || user.status !== "active") {
    await getDummyHash();
    return;
  }

  const token = await db.transaction(async (tx) => {
    const t = await issueToken(tx, user.id, "password_reset", null);
    await audit(
      {
        actor: { id: user.id, email: user.email },
        action: "auth.password_reset_requested",
        resourceType: "user",
        resourceId: user.id,
        summary: "Pedido de redefinição de senha",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
      tx,
    );
    return t;
  });

  await sendMail(selfResetMail(user, tokenUrl("password_reset", token)));
}

/** Troca de senha pelo próprio usuário logado: exige a senha atual e encerra as outras sessões. */
export async function changeOwnPassword(
  input: { userId: string; currentPassword: string; newPassword: string; sessionId: string },
  ctx: RequestCtx,
) {
  await enforce(POLICIES.loginByEmail, `change:${input.userId}`);
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, input.userId) });
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw new HttpError(422, "validation_failed", "Revise os campos destacados.", {
      fields: { currentPassword: "Senha atual incorreta." },
    });
  }
  await db
    .update(schema.users)
    .set({
      passwordHash: await hashPassword(input.newPassword),
      passwordChangedAt: new Date(),
      updatedAt: new Date(),
      version: sql`${schema.users.version} + 1`,
    })
    .where(eq(schema.users.id, user.id));
  const revoked = await invalidateUserSessions(user.id, input.sessionId);
  await audit({
    actor: { id: user.id, email: user.email },
    action: "auth.password_changed",
    resourceType: "user",
    resourceId: user.id,
    summary: revoked > 0 ? `Senha alterada e ${revoked} outra(s) sessão(ões) encerrada(s)` : "Senha alterada",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
  log.info("auth.password_changed", { userId: user.id });
}
