import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, schema, type Tx } from "@/server/db";
import { audit } from "@/server/audit";
import { env } from "@/server/env";
import { conflict, forbidden, HttpError, notFound, unauthorized } from "@/server/http/errors";
import { getDummyHash, hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { enforce, hashIdentifier, POLICIES } from "@/server/security/rate-limit";
import { HUB_OPEN_STATUSES, hubCan, type PartnerRole, type PartnerStatus } from "@/lib/alliance/constants";
import { deliver, hubEmailChangeMail, hubInviteMail, hubResetMail } from "../mail";
import { createHubSession, invalidateHubUserSessions, type HubUser } from "./session";
import { isTwoFactorAvailable, newRecoveryCodes, newSecret, normalizeRecovery, openSecret, otpauthUri, sealSecret, secretToBase32, verifyTotp } from "./totp";

type Ctx = { ip: string | null; userAgent: string | null };
type CmsActor = { id: string; email: string; name: string };

/**
 * Contas do Alliance Hub: convite, login (com segundo fator opcional), recuperação e troca de e-mail.
 * Mesmas garantias do login do CMS: mensagens e tempo iguais para e-mail inexistente ou senha errada,
 * limites por IP e por e-mail que fecham em falha, tokens de uso único guardados só como hash.
 */

const INVALID = "E-mail ou senha incorretos.";
const TTL = { invite: 7 * 24 * 3600_000, password_reset: 3600_000, email_change: 24 * 3600_000, login_challenge: 10 * 60_000 } as const;
type TokenType = keyof typeof TTL;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
const siteOrigin = () => new URL(env.NEXT_PUBLIC_SITE_URL).origin;
export const hubTokenUrl = (type: "invite" | "password_reset" | "email_change", token: string) =>
  `${siteOrigin()}/alliance/${type === "invite" ? "convite" : type === "password_reset" ? "redefinir-senha" : "confirmar-email"}/${token}`;

const hubActor = (u: { email: string }) => ({ id: null, email: u.email });

async function issueToken(tx: Tx, partnerUserId: string, type: TokenType, payload: unknown = null) {
  await tx
    .update(schema.partnerUserTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.partnerUserTokens.partnerUserId, partnerUserId), eq(schema.partnerUserTokens.type, type), isNull(schema.partnerUserTokens.usedAt)));
  const token = generateToken(32);
  await tx.insert(schema.partnerUserTokens).values({ id: hashToken(token), partnerUserId, type, payload, expiresAt: new Date(Date.now() + TTL[type]) });
  return token;
}

/** Consome o token (UPDATE condicional: só um pedido concorrente consegue). */
async function consumeToken(tx: Tx, token: string, type: TokenType) {
  if (!/^[a-z2-7]{52}$/.test(token)) return null;
  const [row] = await tx
    .update(schema.partnerUserTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.partnerUserTokens.id, hashToken(token)), eq(schema.partnerUserTokens.type, type), isNull(schema.partnerUserTokens.usedAt), gt(schema.partnerUserTokens.expiresAt, new Date())))
    .returning({ partnerUserId: schema.partnerUserTokens.partnerUserId, payload: schema.partnerUserTokens.payload });
  return row ?? null;
}

const expiredLink = () => new HttpError(410, "link_expired", "Este link expirou ou já foi usado. Peça um novo.");

/** Consulta um link sem consumir (para decidir entre o formulário e "link expirado"). */
export async function peekHubToken(token: string, type: "invite" | "password_reset" | "email_change") {
  if (!/^[a-z2-7]{52}$/.test(token)) return null;
  const [row] = await getDb()
    .select({ name: schema.partnerUsers.name, email: schema.partnerUsers.email, status: schema.partnerUsers.status, company: schema.partners.tradeName, partnerStatus: schema.partners.status, payload: schema.partnerUserTokens.payload })
    .from(schema.partnerUserTokens)
    .innerJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.partnerUserTokens.partnerUserId))
    .innerJoin(schema.partners, eq(schema.partners.id, schema.partnerUsers.partnerId))
    .where(and(eq(schema.partnerUserTokens.id, hashToken(token)), eq(schema.partnerUserTokens.type, type), isNull(schema.partnerUserTokens.usedAt), gt(schema.partnerUserTokens.expiresAt, new Date())));
  if (!row || row.status === "disabled" || !HUB_OPEN_STATUSES.includes(row.partnerStatus as PartnerStatus)) return null;
  return row;
}

/* -------------------------------------------------------------------------- */
/* Login                                                                       */
/* -------------------------------------------------------------------------- */

export type LoginResult = { kind: "session"; token: string; expiresAt: Date } | { kind: "two_factor"; challenge: string };

export async function hubLogin(input: { email: string; password: string }, ctx: Ctx): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  await enforce(POLICIES.hubLoginByIp, ctx.ip ?? "unknown");
  await enforce(POLICIES.hubLoginByEmail, hashIdentifier(email));

  const db = getDb();
  const [user] = await db
    .select({ id: schema.partnerUsers.id, email: schema.partnerUsers.email, passwordHash: schema.partnerUsers.passwordHash, status: schema.partnerUsers.status, totpEnabledAt: schema.partnerUsers.totpEnabledAt, partnerStatus: schema.partners.status })
    .from(schema.partnerUsers)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.partnerUsers.partnerId))
    .where(sql`lower(${schema.partnerUsers.email}) = ${email}`);

  const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), input.password);
  const open = user && HUB_OPEN_STATUSES.includes(user.partnerStatus as PartnerStatus);
  if (!user || !valid || user.status !== "active" || !user.passwordHash || !open) {
    if (user) {
      await audit({ actor: hubActor(user), action: "alliance.hub.login_failed", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: tentativa de login recusada", ...ctx });
    }
    throw unauthorized(INVALID);
  }
  if (needsRehash(user.passwordHash)) await db.update(schema.partnerUsers).set({ passwordHash: await hashPassword(input.password) }).where(eq(schema.partnerUsers.id, user.id));

  // Com 2FA ativo (e a chave configurada), a senha certa só abre o segundo passo.
  if (user.totpEnabledAt && isTwoFactorAvailable()) {
    const challenge = await db.transaction((tx) => issueToken(tx, user.id, "login_challenge"));
    return { kind: "two_factor", challenge };
  }
  return { kind: "session", ...(await finishLogin(user, ctx)) };
}

async function finishLogin(user: { id: string; email: string }, ctx: Ctx) {
  const session = await createHubSession(user.id, ctx);
  await getDb().update(schema.partnerUsers).set({ lastLoginAt: new Date() }).where(eq(schema.partnerUsers.id, user.id));
  await audit({ actor: hubActor(user), action: "alliance.hub.login", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: login", ...ctx });
  return session;
}

/** Segundo passo: código do aplicativo autenticador ou um código de recuperação (que é consumido). */
export async function hubVerifyTwoFactor(input: { challenge: string; code: string }, ctx: Ctx) {
  await enforce(POLICIES.hubTwoFactor, hashIdentifier(input.challenge));
  if (!isTwoFactorAvailable()) throw new HttpError(503, "unavailable", "A verificação em duas etapas está indisponível. Fale com a Rocket Vision.");
  const db = getDb();
  const user = await db.transaction(async (tx) => {
    // Lê o desafio sem consumir: um código errado não queima o desafio (o limite acima conta as tentativas).
    const [token] = await tx
      .select({ partnerUserId: schema.partnerUserTokens.partnerUserId })
      .from(schema.partnerUserTokens)
      .where(and(eq(schema.partnerUserTokens.id, hashToken(input.challenge)), eq(schema.partnerUserTokens.type, "login_challenge"), isNull(schema.partnerUserTokens.usedAt), gt(schema.partnerUserTokens.expiresAt, new Date())));
    if (!token) throw expiredLink();
    const [user] = await tx.select().from(schema.partnerUsers).where(eq(schema.partnerUsers.id, token.partnerUserId)).for("update");
    if (!user || user.status !== "active" || !user.totpSecretEnc) throw expiredLink();

    const code = input.code.replace(/\s/g, "");
    let ok = /^\d{6}$/.test(code) && verifyTotp(openSecret(user.totpSecretEnc), code);
    let recoveryUsed = false;
    if (!ok) {
      const hash = hashToken(normalizeRecovery(code));
      if (user.recoveryCodes.includes(hash)) {
        ok = true;
        recoveryUsed = true;
        await tx.update(schema.partnerUsers).set({ recoveryCodes: user.recoveryCodes.filter((h) => h !== hash) }).where(eq(schema.partnerUsers.id, user.id));
      }
    }
    if (!ok) throw new HttpError(422, "validation_failed", "Código incorreto.", { fields: { code: "Código incorreto. Confira o aplicativo e tente de novo." } });
    const consumed = await consumeToken(tx, input.challenge, "login_challenge");
    if (!consumed) throw expiredLink();
    if (recoveryUsed) {
      await audit({ actor: hubActor(user), action: "alliance.hub.recovery_code_used", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: login com código de recuperação", ...ctx }, tx);
    }
    return user;
  });
  return finishLogin(user, ctx);
}

/* -------------------------------------------------------------------------- */
/* Convites                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Convida uma pessoa para a equipe de uma empresa parceira. Quem convida pode ser a Rocket (CMS) ou
 * alguém da própria empresa com permissão (Hub). Um e-mail pertence a uma única conta do Hub.
 * O convite nunca dá acesso sozinho: a pessoa precisa abrir o link e criar a senha.
 */
export async function invitePartnerUser(
  by: { kind: "cms"; actor: CmsActor } | { kind: "hub"; user: HubUser },
  partnerId: string,
  input: { name: string; email: string; role: PartnerRole },
  ctx: Ctx,
) {
  const email = normalizeEmail(input.email);
  if (by.kind === "hub") {
    if (by.user.partner.id !== partnerId) throw forbidden();
    if (!hubCan(by.user.role, "team.manage", { managersInvite: by.user.partner.managersInvite })) throw forbidden();
    // Manager (quando habilitado) convida só membros; ninguém cria outro owner pelo Hub.
    if (by.user.role !== "owner" && input.role !== "member") throw forbidden("Você só pode convidar membros.");
    if (input.role === "owner") throw forbidden("O Responsável é definido pela Rocket Vision.");
  }
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [partner] = await tx.select({ id: schema.partners.id, tradeName: schema.partners.tradeName, status: schema.partners.status }).from(schema.partners).where(eq(schema.partners.id, partnerId));
    if (!partner) throw notFound("Parceiro não encontrado.");
    if (!HUB_OPEN_STATUSES.includes(partner.status as PartnerStatus)) throw conflict("A empresa precisa estar em onboarding ou ativa para receber acessos ao Hub.", "partner_closed");

    const [existing] = await tx.select().from(schema.partnerUsers).where(sql`lower(${schema.partnerUsers.email}) = ${email}`).for("update");
    if (existing && existing.partnerId !== partnerId) {
      throw new HttpError(409, "email_taken", "Este e-mail já tem acesso ao Hub por outra empresa.", { fields: { email: "Este e-mail já tem acesso ao Hub por outra empresa." } });
    }
    if (existing && existing.status === "active") {
      throw new HttpError(409, "email_taken", "Esta pessoa já tem acesso ativo.", { fields: { email: "Esta pessoa já tem acesso ativo ao Hub." } });
    }
    const values = {
      partnerId,
      email,
      name: input.name,
      role: input.role,
      status: "invited" as const,
      invitedByUserId: by.kind === "cms" ? by.actor.id : null,
      invitedByPartnerUserId: by.kind === "hub" ? by.user.id : null,
    };
    const [user] = existing
      ? await tx.update(schema.partnerUsers).set({ ...values, passwordHash: null, updatedAt: new Date(), version: sql`${schema.partnerUsers.version} + 1` }).where(eq(schema.partnerUsers.id, existing.id)).returning()
      : await tx.insert(schema.partnerUsers).values(values).returning();
    const token = await issueToken(tx, user.id, "invite");
    await audit(
      {
        actor: by.kind === "cms" ? by.actor : hubActor(by.user),
        action: by.kind === "cms" ? "alliance.hub_user.invited" : "alliance.hub.team_invited",
        resourceType: "partner_user",
        resourceId: user.id,
        summary: `Convidou ${email} (${input.role}) para o Alliance Hub da ${partner.tradeName}`,
        ...ctx,
      },
      tx,
    );
    return { user, token, company: partner.tradeName };
  });

  const link = hubTokenUrl("invite", result.token);
  const invitedBy = by.kind === "cms" ? `${by.actor.name}, da Rocket Vision,` : `${by.user.name}, da ${result.company},`;
  const status = await deliver({
    dedupeKey: `hub-invite:${result.user.id}:${Date.now()}`,
    template: "hub_invite",
    to: email,
    partnerId,
    mail: hubInviteMail(email, { name: input.name, company: result.company, invitedBy: invitedBy.replace(/,$/, ""), link }),
  });
  // Sem e-mail configurado, o link volta para quem convidou (só no CMS) poder enviar por outro canal.
  return { id: result.user.id, delivered: status === "sent", link: by.kind === "cms" && status !== "sent" ? link : null };
}

/** Aceita o convite: cria a senha, ativa a conta e comprova o e-mail. */
export async function acceptHubInvite(input: { token: string; password: string }, ctx: Ctx) {
  await enforce(POLICIES.hubTokenByIp, ctx.ip ?? "unknown");
  const passwordHash = await hashPassword(input.password);
  const user = await getDb().transaction(async (tx) => {
    const consumed = await consumeToken(tx, input.token, "invite");
    if (!consumed) throw expiredLink();
    const [current] = await tx.select().from(schema.partnerUsers).where(eq(schema.partnerUsers.id, consumed.partnerUserId)).for("update");
    if (!current || current.status === "disabled") throw expiredLink();
    const now = new Date();
    const [updated] = await tx
      .update(schema.partnerUsers)
      .set({ passwordHash, passwordChangedAt: now, status: "active", emailVerifiedAt: now, updatedAt: now, version: sql`${schema.partnerUsers.version} + 1` })
      .where(eq(schema.partnerUsers.id, current.id))
      .returning();
    await tx.delete(schema.partnerSessions).where(eq(schema.partnerSessions.partnerUserId, current.id));
    await audit({ actor: hubActor(updated), action: "alliance.hub.invite_accepted", resourceType: "partner_user", resourceId: current.id, summary: "Alliance Hub: convite aceito e senha criada", ...ctx }, tx);
    return updated;
  });
  return finishLogin(user, ctx);
}

/* -------------------------------------------------------------------------- */
/* Senha                                                                       */
/* -------------------------------------------------------------------------- */

/** Sempre responde igual, exista o e-mail ou não. Só manda o link para contas ativas. */
export async function requestHubPasswordReset(emailInput: string, ctx: Ctx) {
  const email = normalizeEmail(emailInput);
  await enforce(POLICIES.hubResetByIp, ctx.ip ?? "unknown");
  await enforce(POLICIES.hubResetByEmail, hashIdentifier(email));
  const db = getDb();
  const [user] = await db.select().from(schema.partnerUsers).where(sql`lower(${schema.partnerUsers.email}) = ${email}`);
  if (!user || user.status !== "active") {
    await getDummyHash();
    return;
  }
  const token = await db.transaction(async (tx) => {
    const t = await issueToken(tx, user.id, "password_reset");
    await audit({ actor: hubActor(user), action: "alliance.hub.password_reset_requested", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: pedido de redefinição de senha", ...ctx }, tx);
    return t;
  });
  await deliver({ dedupeKey: `hub-reset:${user.id}:${Date.now()}`, template: "hub_reset", to: user.email, partnerId: user.partnerId, mail: hubResetMail(user.email, { name: user.name, link: hubTokenUrl("password_reset", token) }) });
}

export async function confirmHubPasswordReset(input: { token: string; password: string }, ctx: Ctx) {
  await enforce(POLICIES.hubTokenByIp, ctx.ip ?? "unknown");
  const passwordHash = await hashPassword(input.password);
  await getDb().transaction(async (tx) => {
    const consumed = await consumeToken(tx, input.token, "password_reset");
    if (!consumed) throw expiredLink();
    const [user] = await tx.select().from(schema.partnerUsers).where(eq(schema.partnerUsers.id, consumed.partnerUserId)).for("update");
    if (!user || user.status !== "active") throw expiredLink();
    await tx.update(schema.partnerUsers).set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date(), version: sql`${schema.partnerUsers.version} + 1` }).where(eq(schema.partnerUsers.id, user.id));
    // Redefinir a senha encerra todas as sessões (quem estava usando a conta indevidamente sai).
    await tx.delete(schema.partnerSessions).where(eq(schema.partnerSessions.partnerUserId, user.id));
    await audit({ actor: hubActor(user), action: "alliance.hub.password_reset", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: senha redefinida por link", ...ctx }, tx);
  });
}

export async function changeHubPassword(user: HubUser, sessionId: string, input: { currentPassword: string; newPassword: string }, ctx: Ctx) {
  await enforce(POLICIES.hubLoginByEmail, `change:${user.id}`);
  const db = getDb();
  const [row] = await db.select().from(schema.partnerUsers).where(eq(schema.partnerUsers.id, user.id));
  if (!row?.passwordHash || !(await verifyPassword(row.passwordHash, input.currentPassword))) {
    throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { currentPassword: "Senha atual incorreta." } });
  }
  await db.update(schema.partnerUsers).set({ passwordHash: await hashPassword(input.newPassword), passwordChangedAt: new Date(), updatedAt: new Date(), version: sql`${schema.partnerUsers.version} + 1` }).where(eq(schema.partnerUsers.id, user.id));
  const revoked = await invalidateHubUserSessions(user.id, sessionId);
  await audit({ actor: hubActor(user), action: "alliance.hub.password_changed", resourceType: "partner_user", resourceId: user.id, summary: revoked ? `Alliance Hub: senha alterada e ${revoked} outra(s) sessão(ões) encerrada(s)` : "Alliance Hub: senha alterada", ...ctx });
}

/* -------------------------------------------------------------------------- */
/* E-mail                                                                      */
/* -------------------------------------------------------------------------- */

/** Troca de e-mail: exige a senha e só vale depois de confirmar pelo link enviado ao endereço novo. */
export async function requestHubEmailChange(user: HubUser, input: { email: string; password: string }, ctx: Ctx) {
  await enforce(POLICIES.hubLoginByEmail, `email:${user.id}`);
  const email = normalizeEmail(input.email);
  const db = getDb();
  const [row] = await db.select().from(schema.partnerUsers).where(eq(schema.partnerUsers.id, user.id));
  if (!row?.passwordHash || !(await verifyPassword(row.passwordHash, input.password))) {
    throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { password: "Senha incorreta." } });
  }
  if (email === normalizeEmail(row.email)) throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { email: "Este já é o seu e-mail." } });
  const [taken] = await db.select({ id: schema.partnerUsers.id }).from(schema.partnerUsers).where(sql`lower(${schema.partnerUsers.email}) = ${email}`);
  // Mesmo com o e-mail em uso, a resposta é igual (sem revelar contas); o link só não é enviado.
  if (taken) return;
  const token = await db.transaction((tx) => issueToken(tx, user.id, "email_change", { email }));
  await deliver({ dedupeKey: `hub-email:${user.id}:${Date.now()}`, template: "hub_email_change", to: email, partnerId: user.partner.id, mail: hubEmailChangeMail(email, { name: user.name, link: hubTokenUrl("email_change", token) }) });
  await audit({ actor: hubActor(user), action: "alliance.hub.email_change_requested", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: pediu troca de e-mail", ...ctx });
}

export async function confirmHubEmailChange(token: string, ctx: Ctx) {
  await enforce(POLICIES.hubTokenByIp, ctx.ip ?? "unknown");
  await getDb().transaction(async (tx) => {
    const consumed = await consumeToken(tx, token, "email_change");
    const email = (consumed?.payload as { email?: string } | null)?.email;
    if (!consumed || !email) throw expiredLink();
    const [user] = await tx.select().from(schema.partnerUsers).where(eq(schema.partnerUsers.id, consumed.partnerUserId)).for("update");
    if (!user || user.status !== "active") throw expiredLink();
    const [taken] = await tx.select({ id: schema.partnerUsers.id }).from(schema.partnerUsers).where(sql`lower(${schema.partnerUsers.email}) = ${email}`);
    if (taken) throw conflict("Este e-mail passou a ser usado por outra conta. Peça a troca de novo.", "email_taken");
    await tx.update(schema.partnerUsers).set({ email, emailVerifiedAt: new Date(), updatedAt: new Date(), version: sql`${schema.partnerUsers.version} + 1` }).where(eq(schema.partnerUsers.id, user.id));
    await audit({ actor: { id: null, email }, action: "alliance.hub.email_changed", resourceType: "partner_user", resourceId: user.id, summary: `Alliance Hub: e-mail trocado de ${user.email} para ${email}`, ...ctx }, tx);
  });
}

/* -------------------------------------------------------------------------- */
/* Verificação em duas etapas                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Início da ativação: gera um segredo e devolve a chave e o URI para o aplicativo. O segredo fica
 * guardado (cifrado), mas só passa a valer depois de confirmado com um código.
 */
export async function startTotpSetup(user: HubUser) {
  if (!isTwoFactorAvailable()) throw new HttpError(503, "unavailable", "A verificação em duas etapas ainda não foi habilitada pela Rocket Vision.");
  if (user.totpEnabled) throw conflict("A verificação em duas etapas já está ativa.", "already_enabled");
  const secret = newSecret();
  await getDb().update(schema.partnerUsers).set({ totpSecretEnc: sealSecret(secret), totpEnabledAt: null }).where(eq(schema.partnerUsers.id, user.id));
  return { key: secretToBase32(secret), uri: otpauthUri(secret, user.email) };
}

export async function confirmTotpSetup(user: HubUser, code: string, ctx: Ctx) {
  await enforce(POLICIES.hubTwoFactor, `setup:${user.id}`);
  const db = getDb();
  const [row] = await db.select().from(schema.partnerUsers).where(eq(schema.partnerUsers.id, user.id));
  if (!row?.totpSecretEnc || row.totpEnabledAt) throw conflict("Comece a configuração de novo.", "no_setup");
  if (!verifyTotp(openSecret(row.totpSecretEnc), code)) throw new HttpError(422, "validation_failed", "Código incorreto.", { fields: { code: "Código incorreto. Confira a hora do celular e tente de novo." } });
  const { codes, hashes } = newRecoveryCodes();
  await db.update(schema.partnerUsers).set({ totpEnabledAt: new Date(), recoveryCodes: hashes, updatedAt: new Date() }).where(eq(schema.partnerUsers.id, user.id));
  await audit({ actor: hubActor(user), action: "alliance.hub.2fa_enabled", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: ativou a verificação em duas etapas", ...ctx });
  return { recoveryCodes: codes };
}

export async function disableTotp(user: HubUser, password: string, ctx: Ctx) {
  await enforce(POLICIES.hubLoginByEmail, `2fa-off:${user.id}`);
  const db = getDb();
  const [row] = await db.select().from(schema.partnerUsers).where(eq(schema.partnerUsers.id, user.id));
  if (!row?.passwordHash || !(await verifyPassword(row.passwordHash, password))) throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { password: "Senha incorreta." } });
  await db.update(schema.partnerUsers).set({ totpSecretEnc: null, totpEnabledAt: null, recoveryCodes: [], updatedAt: new Date() }).where(eq(schema.partnerUsers.id, user.id));
  await audit({ actor: hubActor(user), action: "alliance.hub.2fa_disabled", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: desativou a verificação em duas etapas", ...ctx });
}

export async function regenerateRecoveryCodes(user: HubUser, password: string, ctx: Ctx) {
  await enforce(POLICIES.hubLoginByEmail, `2fa-codes:${user.id}`);
  const db = getDb();
  const [row] = await db.select().from(schema.partnerUsers).where(eq(schema.partnerUsers.id, user.id));
  if (!row?.totpEnabledAt) throw conflict("Ative a verificação em duas etapas primeiro.", "not_enabled");
  if (!row.passwordHash || !(await verifyPassword(row.passwordHash, password))) throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { password: "Senha incorreta." } });
  const { codes, hashes } = newRecoveryCodes();
  await db.update(schema.partnerUsers).set({ recoveryCodes: hashes, updatedAt: new Date() }).where(eq(schema.partnerUsers.id, user.id));
  await audit({ actor: hubActor(user), action: "alliance.hub.recovery_codes", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: gerou novos códigos de recuperação", ...ctx });
  return { recoveryCodes: codes };
}

/** A Rocket pode desativar o 2FA de alguém que perdeu o celular e os códigos (com registro). */
export async function resetTotpByCms(actor: CmsActor, partnerUserId: string, ctx: Ctx) {
  const [row] = await getDb().update(schema.partnerUsers).set({ totpSecretEnc: null, totpEnabledAt: null, recoveryCodes: [], updatedAt: new Date() }).where(eq(schema.partnerUsers.id, partnerUserId)).returning({ email: schema.partnerUsers.email });
  if (!row) throw notFound("Pessoa não encontrada.");
  await invalidateHubUserSessions(partnerUserId);
  await audit({ actor, action: "alliance.hub_user.2fa_reset", resourceType: "partner_user", resourceId: partnerUserId, summary: `Desativou o 2FA de ${row.email} no Alliance Hub (sessões encerradas)`, ...ctx });
}
