import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { HttpError } from "@/server/http/errors";
import { consumeToken, login } from "@/server/auth/service";
import { validateSessionToken, type SessionUser } from "@/server/auth/session";
import { createResetLink, createRole, deleteRole, inviteUser, listUsers, resendInvite, revokeUserSessions, setUserStatus, updateRole, updateUser } from "@/server/users/service";
import { createUser, resetTestDatabase } from "../support/db";

const ctx = { ip: "203.0.113.60", userAgent: "vitest" };
const PASSWORD = "uma senha longa e boa 42";
let roles: Record<string, string>;

async function expectStatus(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  return error as HttpError;
}

async function actorFor(email: string, roleKey: string): Promise<SessionUser> {
  await createUser(getDb(), { email, roleKey, password: PASSWORD });
  const { token } = await login({ email, password: PASSWORD }, ctx);
  return (await validateSessionToken(token))!.user;
}

const versionOf = async (id: string) => (await getDb().select({ v: schema.users.version }).from(schema.users).where(eq(schema.users.id, id)))[0].v;

beforeAll(async () => {
  await resetTestDatabase();
  const rows = await getDb().select().from(schema.roles);
  roles = Object.fromEntries(rows.map((r) => [r.key, r.id]));
});

beforeEach(async () => {
  await getDb().execute(sql`TRUNCATE rate_limits, sessions, user_tokens, audit_logs`);
  await getDb().execute(sql`DELETE FROM users`);
  await getDb().execute(sql`DELETE FROM roles WHERE key NOT IN ('owner','admin','editor','collaborator')`);
});

describe("convites", () => {
  it("convida, devolve o link quando não há e-mail e o convite ativa a conta", async () => {
    const admin = await actorFor("admin@teste.local", "admin");
    const result = await inviteUser(admin, { email: "Nova@Teste.local", name: "Nova Pessoa", roleId: roles.editor }, ctx);
    expect(result.emailed).toBe(false);
    expect(result.link).toMatch(/\/cms\/convite\/[a-z2-7]{52}$/);

    const token = result.link!.split("/").pop()!;
    await consumeToken({ token, password: "senha nova bem longa 1" }, "invite", ctx);
    const user = (await listUsers()).find((u) => u.email === "nova@teste.local");
    expect(user?.status).toBe("active");
    expect(user?.roleKey).toBe("editor");
    expect(JSON.stringify(await listUsers())).not.toMatch(/argon2|password/i);
  });

  it("e-mail repetido responde 409", async () => {
    const admin = await actorFor("admin@teste.local", "admin");
    await expectStatus(inviteUser(admin, { email: "ADMIN@teste.local", name: "X", roleId: roles.editor }, ctx), 409);
  });

  it("só owner convida owner; ninguém convida para função com permissões que não tem", async () => {
    const admin = await actorFor("admin@teste.local", "admin");
    await expectStatus(inviteUser(admin, { email: "o@teste.local", name: "O", roleId: roles.owner }, ctx), 403);

    const editor = await actorFor("editor@teste.local", "editor");
    // Editor não tem users.* nem audit.*: não pode criar um admin.
    await expectStatus(inviteUser(editor, { email: "a@teste.local", name: "A", roleId: roles.admin }, ctx), 403);

    const owner = await actorFor("owner@teste.local", "owner");
    await expect(inviteUser(owner, { email: "o2@teste.local", name: "O2", roleId: roles.owner }, ctx)).resolves.toBeTruthy();
  });

  it("reenviar invalida o convite anterior", async () => {
    const admin = await actorFor("admin@teste.local", "admin");
    const first = await inviteUser(admin, { email: "c@teste.local", name: "C", roleId: roles.collaborator }, ctx);
    await resendInvite(admin, first.userId, ctx);
    await expectStatus(consumeToken({ token: first.link!.split("/").pop()!, password: "senha nova bem longa 1" }, "invite", ctx), 410);
  });
});

describe("proteções", () => {
  it("nunca fica sem owner ativo", async () => {
    const owner = await actorFor("owner@teste.local", "owner");
    const other = await actorFor("owner2@teste.local", "owner");
    await setUserStatus(owner, other.id, "disabled", await versionOf(other.id), ctx);
    // Agora o único owner ativo é quem está agindo: não pode rebaixar nem desativar a si mesmo.
    await expectStatus(setUserStatus(owner, owner.id, "disabled", await versionOf(owner.id), ctx), 409);
    await expectStatus(updateUser(owner, owner.id, { name: "Owner", roleId: roles.admin, version: await versionOf(owner.id) }, ctx), 409);
  });

  it("admin não mexe em owner", async () => {
    const owner = await actorFor("owner@teste.local", "owner");
    const admin = await actorFor("admin@teste.local", "admin");
    await expectStatus(setUserStatus(admin, owner.id, "disabled", await versionOf(owner.id), ctx), 403);
    await expectStatus(updateUser(admin, owner.id, { name: "X", roleId: roles.editor, version: await versionOf(owner.id) }, ctx), 403);
    await expectStatus(revokeUserSessions(admin, owner.id, ctx), 403);
    await expectStatus(createResetLink(admin, owner.id, ctx), 403);
  });

  it("desativar encerra as sessões e bloqueia o login", async () => {
    const admin = await actorFor("admin@teste.local", "admin");
    await createUser(getDb(), { email: "alvo@teste.local", roleKey: "editor", password: PASSWORD });
    const session = await login({ email: "alvo@teste.local", password: PASSWORD }, ctx);
    const target = (await validateSessionToken(session.token))!.user;

    await setUserStatus(admin, target.id, "disabled", await versionOf(target.id), ctx);
    expect(await validateSessionToken(session.token)).toBeNull();
    await expectStatus(login({ email: "alvo@teste.local", password: PASSWORD }, ctx), 401);

    await setUserStatus(admin, target.id, "active", await versionOf(target.id), ctx);
    await expect(login({ email: "alvo@teste.local", password: PASSWORD }, ctx)).resolves.toBeTruthy();
  });

  it("trocar função exige users.manage_roles e é auditado", async () => {
    const admin = await actorFor("admin@teste.local", "admin");
    await createUser(getDb(), { email: "e@teste.local", roleKey: "editor", password: PASSWORD });
    const target = (await listUsers()).find((u) => u.email === "e@teste.local")!;
    await updateUser(admin, target.id, { name: "Editora", roleId: roles.collaborator, version: target.version }, ctx);
    const [log] = await getDb().select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "user.updated"));
    expect(log.changes).toEqual({ name: { before: "Pessoa Teste", after: "Editora" }, role: { before: "Editor", after: "Colaborador" } });
    await expectStatus(updateUser(admin, target.id, { name: "Y", roleId: roles.editor, version: target.version }, ctx), 409);
  });

  it("link de redefinição só para conta ativa de outra pessoa", async () => {
    const admin = await actorFor("admin@teste.local", "admin");
    await expectStatus(createResetLink(admin, admin.id, ctx), 409);
    await createUser(getDb(), { email: "r@teste.local", roleKey: "editor", password: PASSWORD });
    const target = (await listUsers()).find((u) => u.email === "r@teste.local")!;
    const { link } = await createResetLink(admin, target.id, ctx);
    expect(link).toMatch(/\/cms\/redefinir-senha\/[a-z2-7]{52}$/);
  });
});

describe("funções", () => {
  it("cria, edita e remove funções sem escalar privilégio", async () => {
    const admin = await actorFor("admin@teste.local", "admin");
    const { id } = await createRole(admin, { name: "Revisor", description: "Só leitura", permissions: ["landing.view", "projects.view"] }, ctx);
    await updateRole(admin, id, { name: "Revisor", description: "Lê e edita projetos", permissions: ["landing.view", "projects.view", "projects.edit"] }, ctx);
    await expectStatus(createRole(admin, { name: "Revisor", description: "", permissions: [] }, ctx), 409);
    await expectStatus(updateRole(admin, roles.owner, { name: "Owner", description: "", permissions: [] }, ctx), 403);
    await expectStatus(createRole(admin, { name: "Inventada", description: "", permissions: ["tudo.liberado"] }, ctx), 422);

    const editor = await actorFor("editor@teste.local", "editor");
    await expectStatus(createRole(editor, { name: "Poderosa", description: "", permissions: ["users.manage_roles"] }, ctx), 403);

    await createUser(getDb(), { email: "rev@teste.local", roleKey: "editor", status: "invited" });
    await getDb().update(schema.users).set({ roleId: id }).where(eq(schema.users.email, "rev@teste.local"));
    await expectStatus(deleteRole(admin, id, ctx), 409);
    await getDb().update(schema.users).set({ roleId: roles.editor }).where(eq(schema.users.email, "rev@teste.local"));
    await deleteRole(admin, id, ctx);
    await expectStatus(deleteRole(admin, roles.owner, ctx), 403);
  });

  it("permissões mudam na hora para quem já está logado", async () => {
    const admin = await actorFor("admin@teste.local", "admin");
    const { id } = await createRole(admin, { name: "Temporária", description: "", permissions: ["projects.view"] }, ctx);
    await createUser(getDb(), { email: "t@teste.local", roleKey: "editor", password: PASSWORD });
    await getDb().update(schema.users).set({ roleId: id }).where(eq(schema.users.email, "t@teste.local"));
    const { token } = await login({ email: "t@teste.local", password: PASSWORD }, ctx);
    expect((await validateSessionToken(token))!.user.permissions.has("projects.edit")).toBe(false);
    await updateRole(admin, id, { name: "Temporária", description: "", permissions: ["projects.view", "projects.edit"] }, ctx);
    expect((await validateSessionToken(token))!.user.permissions.has("projects.edit")).toBe(true);
  });
});
