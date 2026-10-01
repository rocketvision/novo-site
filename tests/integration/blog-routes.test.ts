import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Sessão controlada pelo teste: o cookie devolve o token da pessoa "logada" no momento.
let token: string | undefined;
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: () => {} }));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
  cookies: async () => ({ get: () => (token ? { value: token } : undefined) }),
  headers: async () => new Headers(),
}));
// cache() do React memoriza por requisição; aqui cada chamada é uma requisição nova.
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import { getDb } from "@/server/db";
import { createSession } from "@/server/auth/session";
import { isPermission } from "@/server/authz/permissions";
import * as articles from "@/app/api/cms/blog/articles/route";
import * as article from "@/app/api/cms/blog/articles/[id]/route";
import * as actions from "@/app/api/cms/blog/articles/[id]/actions/route";
import * as categories from "@/app/api/cms/blog/categories/route";
import * as blogMedia from "@/app/api/cms/blog/media/route";
import * as cron from "@/app/api/cron/blog-publish/route";
import { createUser, resetTestDatabase } from "../support/db";
import { HUB_PERMISSIONS } from "@/lib/alliance/constants";

const ORIGIN = "http://localhost:3000";
let adminToken: string;
let columnistToken: string;
let otherToken: string;

async function tokenFor(email: string, roleKey: string) {
  const user = await createUser(getDb(), { email, roleKey, name: email.split("@")[0], password: "senha-de-teste-longa-1" });
  return (await createSession(user.id, { ip: null, userAgent: null })).token;
}

function req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`${ORIGIN}${path}`, {
    method,
    headers: { ...(body !== undefined && { "content-type": "application/json" }), ...(method !== "GET" && { origin: ORIGIN }), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const params = <P,>(p: P) => ({ params: Promise.resolve(p) });
const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Texto inicial do artigo com palavras suficientes para enviar. ".repeat(6) }] }] };
const data = (slug: string) => ({ title: "Artigo", slug, subtitle: "", excerpt: "", content: doc, categoryId: null, authorId: null, coverMediaId: null, coverAlt: "", coverCaption: "", seoTitle: "", seoDescription: "", featured: false });

beforeAll(async () => {
  await resetTestDatabase();
  adminToken = await tokenFor("admin-rotas@rocketvision.dev", "admin");
  columnistToken = await tokenFor("col-rotas@exemplo.com", "columnist");
  otherToken = await tokenFor("outra-rotas@exemplo.com", "columnist");
});

describe("rotas do Blog", () => {
  it("sem sessão: 401", async () => {
    token = undefined;
    expect((await articles.GET(req("GET", "/api/cms/blog/articles"), params({}))).status).toBe(401);
  });

  it("mutação de outra origem: 403 (CSRF)", async () => {
    token = columnistToken;
    const res = await articles.POST(req("POST", "/api/cms/blog/articles", { data: data("csrf") }, { origin: "https://evil.example" }), params({}));
    expect(res.status).toBe(403);
  });

  it("HTML no lugar do documento: 422", async () => {
    token = columnistToken;
    const res = await articles.POST(req("POST", "/api/cms/blog/articles", { data: { ...data("html"), content: "<script>alert(1)</script>" } }), params({}));
    expect(res.status).toBe(422);
  });

  it("Colunista cria; outra pessoa recebe 404; categoria e ação de editor recebem 403", async () => {
    token = columnistToken;
    const created = await articles.POST(req("POST", "/api/cms/blog/articles", { data: data("rota-colunista") }), params({}));
    expect(created.status).toBe(201);
    const { id, version } = await created.json();

    token = otherToken;
    expect((await article.GET(req("GET", `/api/cms/blog/articles/${id}`), params({ id }))).status).toBe(404);
    expect((await article.PUT(req("PUT", `/api/cms/blog/articles/${id}`, { version, data: data("rota-colunista") }), params({ id }))).status).toBe(404);

    token = columnistToken;
    expect((await categories.POST(req("POST", "/api/cms/blog/categories", { data: { name: "X", slug: "x", description: "", sortOrder: 1 } }), params({}))).status).toBe(403);
    expect((await article.DELETE(req("DELETE", `/api/cms/blog/articles/${id}`, { version, confirmSlug: "rota-colunista" }), params({ id }))).status).toBe(403);
    const submit = await actions.POST(req("POST", `/api/cms/blog/articles/${id}/actions`, { action: "submit", version }), params({ id }));
    expect(submit.status).toBe(200);
    const { version: v2 } = await submit.json();
    expect((await actions.POST(req("POST", `/api/cms/blog/articles/${id}/actions`, { action: "approve", version: v2 }), params({ id }))).status).toBe(403);

    token = adminToken;
    expect((await actions.POST(req("POST", `/api/cms/blog/articles/${id}/actions`, { action: "approve", version: v2 }), params({ id }))).status).toBe(200);
    expect((await article.GET(req("GET", "/api/cms/blog/articles/nao-e-uuid"), params({ id: "nao-e-uuid" }))).status).toBe(404);
  });

  it("biblioteca do Blog mostra ao Colunista só as imagens dele", async () => {
    token = columnistToken;
    const res = await blogMedia.GET(req("GET", "/api/cms/blog/media"), params({}));
    expect(res.status).toBe(200);
    expect((await res.json()).items).toEqual([]);
  });

  it("cron sem o segredo: 401", async () => {
    token = undefined;
    const res = await cron.GET(req("GET", "/api/cron/blog-publish", undefined, { authorization: "Bearer errado" }), params({}));
    expect(res.status).toBe(401);
  });
});

describe("catálogo de permissões", () => {
  it("toda permissão usada em rotas e páginas existe no catálogo", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(name)) files.push(full);
      }
    };
    walk("src/app");
    const used = new Set<string>();
    const hubUsed = new Set<string>();
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      // Rotas e páginas do Alliance Hub usam o catálogo próprio (papéis da empresa parceira).
      const hub = /src[\\/]app[\\/](alliance|api[\\/]alliance[\\/]hub)[\\/]/.test(f);
      for (const m of text.matchAll(/(?:permission:\s*|requirePermission\(\s*|requireHubPermission\(\s*|can\(user,\s*)"([a-z_]+\.[a-z_]+)"/g)) (hub ? hubUsed : used).add(m[1]);
    }
    for (const key of hubUsed) expect(key in HUB_PERMISSIONS, key).toBe(true);
    expect(used.size).toBeGreaterThan(10);
    for (const key of used) expect(isPermission(key), key).toBe(true);
  });
});
