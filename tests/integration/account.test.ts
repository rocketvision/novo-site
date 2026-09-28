import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { changeOwnPassword, login } from "@/server/auth/service";
import { validateSessionToken } from "@/server/auth/session";
import { listOwnSessions, publicSessionId, revokeOtherSessions, revokeOwnSession } from "@/server/cms/account";
import { HttpError } from "@/server/http/errors";
import { createUser, resetTestDatabase } from "../support/db";

const ctx = { ip: "203.0.113.20", userAgent: "vitest" };
const PASSWORD = "uma senha longa e boa 42";

beforeAll(async () => {
  await resetTestDatabase();
});

beforeEach(async () => {
  await getDb().execute(sql`TRUNCATE rate_limits, sessions, user_tokens, audit_logs`);
  await getDb().execute(sql`DELETE FROM users`);
});

async function twoSessions(email: string) {
  const user = await createUser(getDb(), { email, roleKey: "editor", password: PASSWORD });
  const a = await login({ email, password: PASSWORD }, ctx);
  const b = await login({ email, password: PASSWORD }, ctx);
  const current = (await validateSessionToken(a.token))!;
  return { user, a, b, current };
}

describe("minha conta", () => {
  it("troca de senha exige a senha atual e encerra as outras sessões", async () => {
    const { user, a, b, current } = await twoSessions("conta@teste.local");

    const wrong = await changeOwnPassword({ userId: user.id, sessionId: current.id, currentPassword: "errada", newPassword: "nova senha bem longa 1" }, ctx).catch((e) => e);
    expect(wrong).toBeInstanceOf(HttpError);
    expect((wrong as HttpError).status).toBe(422);

    await changeOwnPassword({ userId: user.id, sessionId: current.id, currentPassword: PASSWORD, newPassword: "nova senha bem longa 1" }, ctx);
    expect(await validateSessionToken(a.token)).not.toBeNull();
    expect(await validateSessionToken(b.token)).toBeNull();
    await expect(login({ email: "conta@teste.local", password: "nova senha bem longa 1" }, ctx)).resolves.toBeTruthy();
  });

  it("lista as sessões sem expor o id completo e marca a atual", async () => {
    const { user, current } = await twoSessions("lista@teste.local");
    const sessions = await listOwnSessions(user.id, current.id);
    expect(sessions).toHaveLength(2);
    expect(sessions.every((s) => s.id.length === 16)).toBe(true);
    expect(sessions.filter((s) => s.current)).toHaveLength(1);
  });

  it("encerra uma sessão própria, mas nunca a de outra pessoa nem a atual", async () => {
    const mine = await twoSessions("eu@teste.local");
    const theirs = await twoSessions("outra@teste.local");
    const actor = { id: mine.user.id, email: "eu@teste.local" };

    const foreign = publicSessionId(theirs.current.id);
    await expect(revokeOwnSession(actor, foreign, mine.current.id, ctx)).rejects.toMatchObject({ status: 404 });
    expect(await validateSessionToken(theirs.a.token)).not.toBeNull();

    await expect(revokeOwnSession(actor, publicSessionId(mine.current.id), mine.current.id, ctx)).rejects.toMatchObject({ status: 404 });
    await expect(revokeOwnSession(actor, "' or 1=1 --", mine.current.id, ctx)).rejects.toMatchObject({ status: 404 });

    const other = (await listOwnSessions(mine.user.id, mine.current.id)).find((s) => !s.current)!;
    await revokeOwnSession(actor, other.id, mine.current.id, ctx);
    expect(await validateSessionToken(mine.b.token)).toBeNull();
    expect(await validateSessionToken(mine.a.token)).not.toBeNull();
  });

  it("encerrar as outras mantém só a atual", async () => {
    const { user, a, b, current } = await twoSessions("todas@teste.local");
    expect(await revokeOtherSessions({ id: user.id, email: "todas@teste.local" }, current.id, ctx)).toBe(1);
    expect(await validateSessionToken(a.token)).not.toBeNull();
    expect(await validateSessionToken(b.token)).toBeNull();
  });
});
