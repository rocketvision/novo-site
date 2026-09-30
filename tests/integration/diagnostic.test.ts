import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));

import { getDb } from "@/server/db";
import { diagnostics } from "@/server/db/schema";
import { POST } from "@/app/api/diagnostico/route";
import { PROBLEMS, PRESENCE, SEGMENTS, TIMING } from "@/lib/diagnostic";
import { resetTestDatabase } from "../support/db";

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
const post = (data: unknown) =>
  POST(new Request("http://localhost:3000/api/diagnostico", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` }, body: JSON.stringify(data) }));

beforeAll(async () => {
  await resetTestDatabase();
});

describe("POST /api/diagnostico", () => {
  it("guarda o diagnóstico com o WhatsApp só em dígitos", async () => {
    const response = await post(body);
    expect(response.status).toBe(200);
    const rows = await getDb().select().from(diagnostics);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Ana", business: "Studio Ana", whatsapp: "11987654321", problems: [PROBLEMS[0]], handledAt: null });
  });

  it("recusa respostas inválidas com 422 e aponta os campos", async () => {
    const response = await post({ ...body, whatsapp: "123", segment: "x" });
    expect(response.status).toBe(422);
    expect((await response.json()).fields).toEqual(expect.arrayContaining(["whatsapp", "segment"]));
  });

  it("ignora bots (campo invisível preenchido) sem gravar", async () => {
    const before = (await getDb().select().from(diagnostics)).length;
    expect((await post({ ...body, website: "spam" })).status).toBe(200);
    expect(await getDb().select().from(diagnostics)).toHaveLength(before);
  });

  it("JSON inválido: 400", async () => {
    const response = await POST(new Request("http://localhost:3000/api/diagnostico", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });
});
