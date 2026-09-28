import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { consumeToken, issueToken, login, peekToken, requestPasswordReset } from "@/server/auth/service";
import { validateSessionToken, invalidateUserSessions } from "@/server/auth/session";
import { isSafeInternalPath } from "@/server/authz/guard";
import { HttpError } from "@/server/http/errors";
import { createUser, resetTestDatabase } from "../support/db";

const ctx = { ip: "203.0.113.10", userAgent: "vitest" };
const PASSWORD = "uma senha longa e boa 42";

async function expectHttpError(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  return error as HttpError;
}

beforeAll(async () => {
  await resetTestDatabase();
});

beforeEach(async () => {
  await getDb().execute(sql`TRUNCATE rate_limits, sessions, user_tokens, audit_logs`);
});

describe("login", () => {
  it("cria sessão válida com as permissões da função", async () => {
    await createUser(getDb(), { email: "editor@teste.local", roleKey: "editor", password: PASSWORD });
    const session = await login({ email: " Editor@Teste.LOCAL ", password: PASSWORD }, ctx);

    const valid = await validateSessionToken(session.token);
    expect(valid?.user.email).toBe("editor@teste.local");
    expect(valid?.user.permissions.has("projects.publish")).toBe(true);
    expect(valid?.user.permissions.has("users.view")).toBe(false);

    // O banco guarda só o hash do token.
    const rows = await getDb().select().from(schema.sessions);
    expect(rows[0].id).not.toBe(session.token);
    expect(rows[0].id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("responde igual para senha errada e e-mail inexistente (sem enumeração)", async () => {
    await createUser(getDb(), { email: "alguem@teste.local", roleKey: "editor", password: PASSWORD });
    const wrong = await expectHttpError(login({ email: "alguem@teste.local", password: "errada" }, ctx), 401);
    const missing = await expectHttpError(login({ email: "ninguem@teste.local", password: "errada" }, ctx), 401);
    expect(wrong.message).toBe(missing.message);
  });

  it("recusa conta desativada e convite ainda não aceito", async () => {
    await createUser(getDb(), { email: "off@teste.local", roleKey: "editor", password: PASSWORD, status: "disabled" });
    await createUser(getDb(), { email: "convidado@teste.local", roleKey: "editor", status: "invited" });
    await expectHttpError(login({ email: "off@teste.local", password: PASSWORD }, ctx), 401);
    await expectHttpError(login({ email: "convidado@teste.local", password: PASSWORD }, ctx), 401);
  });

  it("bloqueia força bruta por e-mail com 429 e Retry-After", async () => {
    await createUser(getDb(), { email: "alvo@teste.local", roleKey: "editor", password: PASSWORD });
    for (let i = 0; i < 5; i++) {
      await expectHttpError(login({ email: "alvo@teste.local", password: `errada${i}` }, ctx), 401);
    }
    const blocked = await expectHttpError(login({ email: "alvo@teste.local", password: PASSWORD }, ctx), 429);
    expect(blocked.extra?.retryAfter).toBeGreaterThan(0);
  });

  it("não registra senha na auditoria", async () => {
    await createUser(getDb(), { email: "audit@teste.local", roleKey: "editor", password: PASSWORD });
    await login({ email: "audit@teste.local", password: PASSWORD }, ctx);
    await login({ email: "audit@teste.local", password: "errada" }, ctx).catch(() => {});
    const logs = await getDb().select().from(schema.auditLogs);
    expect(logs.map((l) => l.action).sort()).toEqual(["auth.login", "auth.login_failed"]);
    expect(JSON.stringify(logs)).not.toContain(PASSWORD);
  });
});

describe("sessões", () => {
  it("deixam de valer quando a conta é desativada", async () => {
    const user = await createUser(getDb(), { email: "sessao@teste.local", roleKey: "editor", password: PASSWORD });
    const session = await login({ email: "sessao@teste.local", password: PASSWORD }, ctx);
    await getDb().update(schema.users).set({ status: "disabled" }).where(eq(schema.users.id, user.id));
    expect(await validateSessionToken(session.token)).toBeNull();
  });

  it("expiram pelo prazo", async () => {
    await createUser(getDb(), { email: "expira@teste.local", roleKey: "editor", password: PASSWORD });
    const session = await login({ email: "expira@teste.local", password: PASSWORD }, ctx);
    await getDb().update(schema.sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await validateSessionToken(session.token)).toBeNull();
    expect(await getDb().select().from(schema.sessions)).toHaveLength(0);
  });

  it("podem ser revogadas mantendo a atual", async () => {
    await createUser(getDb(), { email: "multi@teste.local", roleKey: "editor", password: PASSWORD });
    const a = await login({ email: "multi@teste.local", password: PASSWORD }, ctx);
    const b = await login({ email: "multi@teste.local", password: PASSWORD }, ctx);
    const current = await validateSessionToken(a.token);
    await invalidateUserSessions(current!.user.id, current!.id);
    expect(await validateSessionToken(a.token)).not.toBeNull();
    expect(await validateSessionToken(b.token)).toBeNull();
  });

  it("recusam tokens malformados sem consultar o banco", async () => {
    expect(await validateSessionToken("' OR 1=1 --")).toBeNull();
  });
});

describe("links de uso único", () => {
  it("redefinem a senha, encerram sessões e não servem duas vezes", async () => {
    const user = await createUser(getDb(), { email: "reset@teste.local", roleKey: "editor", password: PASSWORD });
    const old = await login({ email: "reset@teste.local", password: PASSWORD }, ctx);
    const token = await getDb().transaction((tx) => issueToken(tx, user.id, "password_reset", null));

    expect(await peekToken(token, "password_reset")).not.toBeNull();
    expect(await peekToken(token, "invite")).toBeNull();

    await consumeToken({ token, password: "outra senha bem longa 7" }, "password_reset", ctx);
    expect(await validateSessionToken(old.token)).toBeNull();
    await expectHttpError(consumeToken({ token, password: "mais uma senha longa 8" }, "password_reset", ctx), 410);

    await expectHttpError(login({ email: "reset@teste.local", password: PASSWORD }, ctx), 401);
    const fresh = await login({ email: "reset@teste.local", password: "outra senha bem longa 7" }, ctx);
    expect(fresh.token).toBeTruthy();
  });

  it("expiram", async () => {
    const user = await createUser(getDb(), { email: "tarde@teste.local", roleKey: "editor", password: PASSWORD });
    const token = await getDb().transaction((tx) => issueToken(tx, user.id, "password_reset", null));
    await getDb().update(schema.userTokens).set({ expiresAt: new Date(Date.now() - 1000) });
    await expectHttpError(consumeToken({ token, password: "nova senha bem longa 9" }, "password_reset", ctx), 410);
  });

  it("um token novo invalida o anterior", async () => {
    const user = await createUser(getDb(), { email: "dois@teste.local", roleKey: "editor", password: PASSWORD });
    const first = await getDb().transaction((tx) => issueToken(tx, user.id, "password_reset", null));
    await getDb().transaction((tx) => issueToken(tx, user.id, "password_reset", null));
    expect(await peekToken(first, "password_reset")).toBeNull();
  });

  it("convite ativa a conta", async () => {
    const user = await createUser(getDb(), { email: "novo@teste.local", roleKey: "collaborator", status: "invited" });
    const token = await getDb().transaction((tx) => issueToken(tx, user.id, "invite", null));
    await consumeToken({ token, password: "senha do convite longa 1" }, "invite", ctx);
    const session = await login({ email: "novo@teste.local", password: "senha do convite longa 1" }, ctx);
    expect((await validateSessionToken(session.token))?.user.roleKey).toBe("collaborator");
  });

  it("pedido de redefinição não revela se o e-mail existe", async () => {
    await expect(requestPasswordReset("nao.existe@teste.local", ctx)).resolves.toBeUndefined();
    const tokens = await getDb().select().from(schema.userTokens);
    expect(tokens).toHaveLength(0);
  });
});

describe("redirecionamento após login", () => {
  it.each(["/cms", "/cms/projetos", "/cms/projetos/abc?aba=seo"])("aceita %s", (path) => {
    expect(isSafeInternalPath(path)).toBe(true);
  });
  it.each(["https://evil.com", "//evil.com", "/cms//evil.com", "/\\evil.com", "/projetos", "javascript:alert(1)", "/cms\\@evil"])(
    "recusa %s",
    (path) => {
      expect(isSafeInternalPath(path)).toBe(false);
    },
  );
});
