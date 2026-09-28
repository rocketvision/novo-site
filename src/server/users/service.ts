import "server-only";
import { and, asc, count, eq, gt, ne, sql } from "drizzle-orm";
import { getDb, schema, type Tx } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { issueToken, normalizeEmail, tokenUrl } from "@/server/auth/service";
import type { SessionUser } from "@/server/auth/session";
import { isPermission, OWNER_ROLE_KEY, type Permission } from "@/server/authz/permissions";
import { conflict, forbidden, HttpError, notFound } from "@/server/http/errors";
import { isMailConfigured, sendMail } from "@/server/mail";
import { adminResetMail, inviteMail } from "@/server/mail-templates";
import { isUuid } from "@/server/media/service";

type Ctx = { ip: string | null; userAgent: string | null };

/**
 * Gestão de usuários e funções.
 *
 * Proteções (todas verificadas aqui, no servidor):
 * - ninguém desativa a si mesmo nem troca a própria função;
 * - o sistema nunca fica sem ao menos um owner ativo;
 * - só um owner atribui, remove ou desativa a função owner;
 * - ninguém concede permissões que não tem (convite, troca de função, edição de função);
 * - funções de sistema não são editadas nem removidas pela interface.
 * Senhas nunca são lidas nem devolvidas: só convites e links de redefinição de uso único.
 */

const actorOf = (u: SessionUser) => ({ id: u.id, email: u.email });

/* -------------------------------------------------------------------------- */
/* Leitura                                                                      */
/* -------------------------------------------------------------------------- */

export async function listUsers() {
  const db = getDb();
  const sessions = db
    .select({ userId: schema.sessions.userId, total: count().as("total") })
    .from(schema.sessions)
    .where(gt(schema.sessions.expiresAt, new Date()))
    .groupBy(schema.sessions.userId)
    .as("s");
  return db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      status: schema.users.status,
      roleId: schema.roles.id,
      roleKey: schema.roles.key,
      roleName: schema.roles.name,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
      version: schema.users.version,
      activeSessions: sql<number>`coalesce(${sessions.total}, 0)::int`,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .leftJoin(sessions, eq(sessions.userId, schema.users.id))
    .orderBy(asc(schema.users.status), asc(schema.users.name));
}

export async function listRoles() {
  const db = getDb();
  const roles = await db.select().from(schema.roles).orderBy(asc(schema.roles.createdAt));
  const perms = await db.select().from(schema.rolePermissions);
  const users = await db.select({ roleId: schema.users.roleId, total: count() }).from(schema.users).groupBy(schema.users.roleId);
  return roles.map((r) => ({
    ...r,
    permissions: perms.filter((p) => p.roleId === r.id).map((p) => p.permissionKey).filter(isPermission),
    userCount: users.find((u) => u.roleId === r.id)?.total ?? 0,
  }));
}

/* -------------------------------------------------------------------------- */
/* Regras                                                                       */
/* -------------------------------------------------------------------------- */

async function loadRole(tx: Tx, roleId: string) {
  if (!isUuid(roleId)) throw new HttpError(422, "validation_failed", "Escolha uma função.", { fields: { roleId: "Função inválida." } });
  const role = await tx.query.roles.findFirst({ where: eq(schema.roles.id, roleId) });
  if (!role) throw new HttpError(422, "validation_failed", "Escolha uma função.", { fields: { roleId: "Função não encontrada." } });
  const perms = await tx.select({ key: schema.rolePermissions.permissionKey }).from(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, roleId));
  return { ...role, permissions: perms.map((p) => p.key) };
}

/** Quem atribui uma função precisa ter todas as permissões dela; a função owner, só outro owner. */
function assertCanAssign(actor: SessionUser, role: { key: string; permissions: string[] }) {
  if (role.key === OWNER_ROLE_KEY && actor.roleKey !== OWNER_ROLE_KEY) throw forbidden("Só um owner pode atribuir a função owner.");
  const missing = role.permissions.filter((p) => !actor.permissions.has(p as Permission));
  if (missing.length > 0) throw forbidden("Você não pode atribuir uma função com permissões que você não tem.");
}

async function lockUser(tx: Tx, id: string, expectedVersion?: number) {
  if (!isUuid(id)) throw notFound("Usuário não encontrado.");
  const [row] = await tx
    .select({ user: schema.users, roleKey: schema.roles.key, roleName: schema.roles.name })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.users.id, id))
    .for("update", { of: schema.users });
  if (!row) throw notFound("Usuário não encontrado.");
  if (expectedVersion !== undefined && row.user.version !== expectedVersion) {
    throw conflict("Este usuário foi alterado por outra pessoa. Recarregue para ver a versão atual.", "stale");
  }
  return row;
}

/** Owners ativos além do informado. As linhas ficam travadas até o fim da transação (sem corrida). */
async function otherActiveOwners(tx: Tx, exceptUserId: string) {
  const rows = await tx
    .select({ id: schema.users.id })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(and(eq(schema.roles.key, OWNER_ROLE_KEY), eq(schema.users.status, "active"), ne(schema.users.id, exceptUserId)))
    .for("update", { of: schema.users });
  return rows.length;
}

/* -------------------------------------------------------------------------- */
/* Convite                                                                      */
/* -------------------------------------------------------------------------- */

type InviteResult = { userId: string; link: string | null; emailed: boolean };

async function deliverInvite(user: { email: string; name: string }, link: string, invitedBy: string) {
  const { delivered } = await sendMail(inviteMail(user, link, invitedBy));
  return delivered;
}

/**
 * Convida alguém: cria o usuário como "convidado" e gera um link de uso único.
 * O link é devolvido para quem convidou quando o e-mail não está configurado ou falhou,
 * para ser enviado por outro canal. Com e-mail funcionando, o link não volta na resposta.
 */
export async function inviteUser(actor: SessionUser, input: { email: string; name: string; roleId: string }, ctx: Ctx): Promise<InviteResult> {
  const email = normalizeEmail(input.email);
  const { userId, token } = await getDb().transaction(async (tx) => {
    const role = await loadRole(tx, input.roleId);
    assertCanAssign(actor, role);
    const existing = await tx.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}`, columns: { id: true } });
    if (existing) throw new HttpError(409, "email_taken", "Já existe um usuário com este e-mail.", { fields: { email: "Este e-mail já tem acesso ou convite." } });

    const [user] = await tx
      .insert(schema.users)
      .values({ email, name: input.name, roleId: role.id, status: "invited", createdBy: actor.id })
      .returning({ id: schema.users.id });
    const t = await issueToken(tx, user.id, "invite", actor.id);
    await audit(
      { actor: actorOf(actor), action: "user.invited", resourceType: "user", resourceId: user.id, summary: `Convidou ${email} como ${role.name}`, ...ctx },
      tx,
    );
    return { userId: user.id, token: t };
  });

  const link = tokenUrl("invite", token);
  const emailed = await deliverInvite({ email, name: input.name }, link, actor.name);
  return { userId, link: emailed ? null : link, emailed };
}

/** Gera um convite novo (o anterior deixa de valer). Só para quem ainda não aceitou. */
export async function resendInvite(actor: SessionUser, userId: string, ctx: Ctx): Promise<InviteResult> {
  const { user, token } = await getDb().transaction(async (tx) => {
    const row = await lockUser(tx, userId);
    if (row.user.status !== "invited") throw conflict("Este usuário já aceitou o convite.", "not_invited");
    if (row.roleKey === OWNER_ROLE_KEY && actor.roleKey !== OWNER_ROLE_KEY) throw forbidden("Só um owner pode reenviar convite de owner.");
    const t = await issueToken(tx, row.user.id, "invite", actor.id);
    await audit({ actor: actorOf(actor), action: "user.invite_resent", resourceType: "user", resourceId: userId, summary: `Gerou um novo convite para ${row.user.email}`, ...ctx }, tx);
    return { user: row.user, token: t };
  });
  const link = tokenUrl("invite", token);
  const emailed = await deliverInvite(user, link, actor.name);
  return { userId, link: emailed ? null : link, emailed };
}

/** Link de redefinição de senha gerado por um administrador (uso único, 1 hora). */
export async function createResetLink(actor: SessionUser, userId: string, ctx: Ctx) {
  const { user, token } = await getDb().transaction(async (tx) => {
    const row = await lockUser(tx, userId);
    if (row.user.status !== "active") throw conflict("Só contas ativas podem redefinir a senha.", "not_active");
    if (row.user.id === actor.id) throw conflict("Para trocar a sua senha, use Minha conta.", "self");
    if (row.roleKey === OWNER_ROLE_KEY && actor.roleKey !== OWNER_ROLE_KEY) throw forbidden("Só um owner pode redefinir a senha de outro owner.");
    const t = await issueToken(tx, row.user.id, "password_reset", actor.id);
    await audit({ actor: actorOf(actor), action: "user.reset_link_created", resourceType: "user", resourceId: userId, summary: `Gerou um link de redefinição de senha para ${row.user.email}`, ...ctx }, tx);
    return { user: row.user, token: t };
  });
  const link = tokenUrl("password_reset", token);
  const { delivered } = await sendMail(adminResetMail(user, link, actor.name));
  return { link: delivered ? null : link, emailed: delivered };
}

/* -------------------------------------------------------------------------- */
/* Edição                                                                       */
/* -------------------------------------------------------------------------- */

export async function updateUser(actor: SessionUser, userId: string, input: { name: string; roleId: string; version: number }, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const row = await lockUser(tx, userId, input.version);
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    const values: Partial<typeof schema.users.$inferInsert> = {};

    if (row.user.name !== input.name) {
      changes.name = { before: row.user.name, after: input.name };
      values.name = input.name;
    }

    if (row.user.roleId !== input.roleId) {
      if (!actor.permissions.has("users.manage_roles")) throw forbidden("Você não pode trocar a função de usuários.");
      if (userId === actor.id) throw conflict("Você não pode trocar a sua própria função.", "self");
      const role = await loadRole(tx, input.roleId);
      assertCanAssign(actor, role);
      // Tirar alguém da função owner: só um owner, e nunca o último ativo.
      if (row.roleKey === OWNER_ROLE_KEY) {
        if (actor.roleKey !== OWNER_ROLE_KEY) throw forbidden("Só um owner pode alterar a função de outro owner.");
        if (row.user.status === "active" && (await otherActiveOwners(tx, userId)) === 0) throw conflict("É preciso manter ao menos um owner ativo.", "last_owner");
      }
      changes.role = { before: row.roleName, after: role.name };
      values.roleId = role.id;
    }

    if (Object.keys(changes).length === 0) return { version: row.user.version };
    const [updated] = await tx
      .update(schema.users)
      .set({ ...values, updatedAt: new Date(), version: sql`${schema.users.version} + 1` })
      .where(eq(schema.users.id, userId))
      .returning({ version: schema.users.version });
    await audit({ actor: actorOf(actor), action: "user.updated", resourceType: "user", resourceId: userId, summary: `Editou o usuário ${row.user.email}`, changes, ...ctx }, tx);
    return { version: updated.version };
  });
}

/** Ativa ou desativa. Desativar encerra todas as sessões na mesma transação. */
export async function setUserStatus(actor: SessionUser, userId: string, target: "active" | "disabled", version: number, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const row = await lockUser(tx, userId, version);
    if (userId === actor.id) throw conflict("Você não pode desativar a sua própria conta.", "self");
    if (row.roleKey === OWNER_ROLE_KEY && actor.roleKey !== OWNER_ROLE_KEY) throw forbidden("Só um owner pode alterar a situação de outro owner.");
    if (row.user.status === target) return { version: row.user.version };

    if (target === "disabled") {
      if (row.roleKey === OWNER_ROLE_KEY && row.user.status === "active" && (await otherActiveOwners(tx, userId)) === 0) {
        throw conflict("É preciso manter ao menos um owner ativo.", "last_owner");
      }
      await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
      // Convites e links pendentes deixam de valer.
      await tx.update(schema.userTokens).set({ usedAt: new Date() }).where(and(eq(schema.userTokens.userId, userId), sql`${schema.userTokens.usedAt} IS NULL`));
    } else if (!row.user.passwordHash) {
      throw conflict("Esta pessoa ainda não aceitou o convite. Reenvie o convite em vez de reativar.", "no_password");
    }

    const [updated] = await tx
      .update(schema.users)
      .set({ status: target, updatedAt: new Date(), version: sql`${schema.users.version} + 1` })
      .where(eq(schema.users.id, userId))
      .returning({ version: schema.users.version });
    await audit(
      {
        actor: actorOf(actor),
        action: target === "disabled" ? "user.disabled" : "user.enabled",
        resourceType: "user",
        resourceId: userId,
        summary: target === "disabled" ? `Desativou ${row.user.email} e encerrou as sessões` : `Reativou ${row.user.email}`,
        changes: { status: { before: row.user.status, after: target } },
        ...ctx,
      },
      tx,
    );
    return { version: updated.version };
  });
}

export async function revokeUserSessions(actor: SessionUser, userId: string, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const row = await lockUser(tx, userId);
    if (userId === actor.id) throw conflict("Para encerrar as suas sessões, use Minha conta.", "self");
    if (row.roleKey === OWNER_ROLE_KEY && actor.roleKey !== OWNER_ROLE_KEY) throw forbidden("Só um owner pode encerrar as sessões de outro owner.");
    const deleted = await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId)).returning({ id: schema.sessions.id });
    await audit(
      { actor: actorOf(actor), action: "user.sessions_revoked", resourceType: "user", resourceId: userId, summary: `Encerrou ${deleted.length} ${deleted.length === 1 ? "sessão" : "sessões"} de ${row.user.email}`, ...ctx },
      tx,
    );
    return { revoked: deleted.length };
  });
}

/* -------------------------------------------------------------------------- */
/* Funções                                                                      */
/* -------------------------------------------------------------------------- */

function roleKeyFrom(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function assertGrantable(actor: SessionUser, permissions: string[]) {
  const unknown = permissions.filter((p) => !isPermission(p));
  if (unknown.length) throw new HttpError(422, "validation_failed", "Permissão desconhecida.");
  if (permissions.some((p) => !actor.permissions.has(p as Permission))) throw forbidden("Você não pode conceder permissões que você não tem.");
}

async function writeRolePermissions(tx: Tx, roleId: string, permissions: string[]) {
  await tx.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, roleId));
  const unique = [...new Set(permissions)];
  if (unique.length) await tx.insert(schema.rolePermissions).values(unique.map((permissionKey) => ({ roleId, permissionKey })));
}

export async function createRole(actor: SessionUser, input: { name: string; description: string; permissions: string[] }, ctx: Ctx) {
  assertGrantable(actor, input.permissions);
  return getDb().transaction(async (tx) => {
    const key = roleKeyFrom(input.name);
    if (!key) throw new HttpError(422, "validation_failed", "Nome inválido.", { fields: { name: "Use letras ou números no nome." } });
    const exists = await tx.query.roles.findFirst({ where: sql`${schema.roles.key} = ${key} OR lower(${schema.roles.name}) = ${input.name.toLowerCase()}` });
    if (exists) throw new HttpError(409, "role_exists", "Já existe uma função com este nome.", { fields: { name: "Escolha outro nome." } });
    const [role] = await tx.insert(schema.roles).values({ key, name: input.name, description: input.description, isSystem: false }).returning({ id: schema.roles.id });
    await writeRolePermissions(tx, role.id, input.permissions);
    await audit(
      { actor: actorOf(actor), action: "role.created", resourceType: "role", resourceId: role.id, summary: `Criou a função ${input.name}`, changes: { permissions: { before: null, after: [...input.permissions].sort() } }, ...ctx },
      tx,
    );
    return { id: role.id };
  });
}

export async function updateRole(actor: SessionUser, roleId: string, input: { name: string; description: string; permissions: string[] }, ctx: Ctx) {
  assertGrantable(actor, input.permissions);
  return getDb().transaction(async (tx) => {
    const role = await loadRole(tx, roleId).catch(() => {
      throw notFound("Função não encontrada.");
    });
    if (role.isSystem) throw forbidden("Funções de sistema não podem ser alteradas.");
    // Quem edita também não pode tirar permissões que não tem (senão poderia reduzir funções "acima" dele).
    const removed = role.permissions.filter((p) => !input.permissions.includes(p));
    if (removed.some((p) => !actor.permissions.has(p as Permission))) throw forbidden("Você não pode alterar permissões que você não tem.");
    if (roleId === actor.roleId && removed.length > 0) throw conflict("Você não pode remover permissões da sua própria função.", "self");

    const before = { name: role.name, description: role.description, permissions: [...role.permissions].sort() };
    const after = { name: input.name, description: input.description, permissions: [...new Set(input.permissions)].sort() };
    await tx.update(schema.roles).set({ name: input.name, description: input.description, updatedAt: new Date() }).where(eq(schema.roles.id, roleId));
    await writeRolePermissions(tx, roleId, input.permissions);
    const changes = diff(before, after);
    if (Object.keys(changes).length) {
      await audit({ actor: actorOf(actor), action: "role.updated", resourceType: "role", resourceId: roleId, summary: `Editou a função ${input.name}`, changes, ...ctx }, tx);
    }
  });
}

export async function deleteRole(actor: SessionUser, roleId: string, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const role = await loadRole(tx, roleId).catch(() => {
      throw notFound("Função não encontrada.");
    });
    if (role.isSystem) throw forbidden("Funções de sistema não podem ser removidas.");
    if (role.permissions.some((p) => !actor.permissions.has(p as Permission))) throw forbidden("Você não pode remover uma função com permissões que você não tem.");
    const [{ total }] = await tx.select({ total: count() }).from(schema.users).where(eq(schema.users.roleId, roleId));
    if (total > 0) throw conflict(`Esta função está atribuída a ${total} ${total === 1 ? "usuário" : "usuários"}. Troque a função deles antes.`, "role_in_use");
    await tx.delete(schema.roles).where(eq(schema.roles.id, roleId));
    await audit({ actor: actorOf(actor), action: "role.deleted", resourceType: "role", resourceId: roleId, summary: `Removeu a função ${role.name}`, ...ctx }, tx);
  });
}

export { isMailConfigured };
