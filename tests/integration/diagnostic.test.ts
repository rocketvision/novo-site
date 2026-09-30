import { beforeAll, describe, expect, it, vi } from "vitest";

// Sessão controlada pelo teste: o cookie devolve o token da pessoa "logada" no momento.
let token: string | undefined;
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: () => {} }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  draftMode: async () => ({ isEnabled: false }),
  cookies: async () => ({ get: () => (token ? { value: token } : undefined) }),
}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import { getDb } from "@/server/db";
import { diagnostics } from "@/server/db/schema";
import { POST } from "@/app/api/diagnostico/route";
import { PROBLEMS, PRESENCE, SEGMENTS, TIMING } from "@/lib/diagnostic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { createSession } from "@/server/auth/session";
import { auditLogs } from "@/server/db/schema";
import * as item from "@/app/api/cms/diagnostics/[id]/route";
import * as exporter from "@/app/api/cms/diagnostics/export/route";
import { createUser, resetTestDatabase } from "../support/db";

const ORIGIN = "http://localhost:3000";
async function tokenFor(email: string, roleKey: string) {
  const user = await createUser(getDb(), { email, roleKey, name: email.split("@")[0], password: "senha-de-teste-longa-1" });
  return (await createSession(user.id, { ip: null, userAgent: null })).token;
}
const cms = (method: string, path: string, body?: unknown) =>
  new NextRequest(`${ORIGIN}${path}`, {
    method,
    headers: { ...(body !== undefined && { "content-type": "application/json" }), ...(method !== "GET" && { origin: ORIGIN }) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
const params = <P,>(p: P) => ({ params: Promise.resolve(p) });

const body = {
  name: "Ana",
  business: "Studio Ana",
  segment: SEGMENTS[1],
  presence: PRESENCE[2],
  problems: [PROBLEMS[0]],
  timing: TIMING[0],
  whatsapp: "(11) 98765-4321",
  source: "/servicos/criacao-de-sites",
};

let ip = 0;
const post = (data: unknown, headers: Record<string, string> = {}) =>
  POST(
    new NextRequest("http://localhost:3000/api/diagnostico", {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": `10.0.0.${++ip}`, ...headers },
      body: typeof data === "string" ? data : JSON.stringify(data),
    }),
    params({}),
  );

beforeAll(async () => {
  await resetTestDatabase();
});

describe("POST /api/diagnostico", () => {
  it("guarda o diagnóstico com o WhatsApp só em dígitos", async () => {
    const response = await post(body);
    expect(response.status).toBe(200);
    const rows = await getDb().select().from(diagnostics);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Ana", business: "Studio Ana", whatsapp: "11987654321", problems: [PROBLEMS[0]], status: "novo", notes: "" });
  });

  it("recusa respostas inválidas com 422 e aponta os campos", async () => {
    const response = await post({ ...body, whatsapp: "123", segment: "x" });
    expect(response.status).toBe(422);
    expect(Object.keys((await response.json()).error.fields)).toEqual(expect.arrayContaining(["whatsapp", "segment"]));
  });

  it("ignora bots (campo invisível preenchido) sem gravar", async () => {
    const before = (await getDb().select().from(diagnostics)).length;
    expect((await post({ ...body, website: "spam" })).status).toBe(200);
    expect(await getDb().select().from(diagnostics)).toHaveLength(before);
  });

  it("JSON inválido: 400; sem JSON: 415; outra origem: 403", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post(body, { "content-type": "text/plain" })).status).toBe(415);
    expect((await post(body, { origin: "https://site-malicioso.com" })).status).toBe(403);
  });
});

describe("Diagnósticos no CMS", () => {
  let adminToken: string;
  let editorToken: string;
  let id: string;

  beforeAll(async () => {
    adminToken = await tokenFor("admin-diag@rocketvision.dev", "admin");
    editorToken = await tokenFor("editor-diag@rocketvision.dev", "editor");
    id = (await getDb().select().from(diagnostics).limit(1))[0].id;
  });

  it("sem sessão: 401; sem permissão: 403", async () => {
    token = undefined;
    expect((await item.PATCH(cms("PATCH", `/api/cms/diagnostics/${id}`, { status: "em_contato" }), params({ id }))).status).toBe(401);
    token = editorToken;
    expect((await item.PATCH(cms("PATCH", `/api/cms/diagnostics/${id}`, { status: "em_contato" }), params({ id }))).status).toBe(403);
    expect((await exporter.GET(cms("GET", "/api/cms/diagnostics/export"), params({}))).status).toBe(403);
  });

  it("muda a etapa e as anotações, e registra na auditoria", async () => {
    token = adminToken;
    const response = await item.PATCH(cms("PATCH", `/api/cms/diagnostics/${id}`, { status: "call_agendada", notes: "Call na terça às 10h." }), params({ id }));
    expect(response.status).toBe(200);
    const [row] = await getDb().select().from(diagnostics).where(eq(diagnostics.id, id));
    expect(row).toMatchObject({ status: "call_agendada", notes: "Call na terça às 10h." });
    expect(row.updatedBy).not.toBeNull();
    const logs = await getDb().select().from(auditLogs).where(eq(auditLogs.resourceId, id));
    expect(logs.some((l) => l.action === "diagnostic.update")).toBe(true);
  });

  it("recusa etapa inexistente", async () => {
    token = adminToken;
    expect((await item.PATCH(cms("PATCH", `/api/cms/diagnostics/${id}`, { status: "ganho" }), params({ id }))).status).toBe(422);
  });

  it("exporta a planilha com acentos e a etapa", async () => {
    token = adminToken;
    const response = await exporter.GET(cms("GET", "/api/cms/diagnostics/export"), params({}));
    expect(response.headers.get("content-type")).toContain("text/csv");
    const text = await response.text();
    expect(text).toContain("Negócio");
    expect(text).toContain("Call agendada");
  });

  it("exclui e deixa registro", async () => {
    token = adminToken;
    expect((await item.DELETE(cms("DELETE", `/api/cms/diagnostics/${id}`), params({ id }))).status).toBe(200);
    expect(await getDb().select().from(diagnostics).where(eq(diagnostics.id, id))).toHaveLength(0);
    expect((await item.DELETE(cms("DELETE", `/api/cms/diagnostics/${id}`), params({ id }))).status).toBe(404);
  });
});
