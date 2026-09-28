import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { eq, sql } from "drizzle-orm";

// Fora do Next não há cache de dados nem requisição: leitura direta e sem pré-visualização.
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: () => {} }));
vi.mock("next/headers", () => ({ draftMode: async () => ({ isEnabled: false }), cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));

import { getDb, schema } from "@/server/db";
import { HttpError } from "@/server/http/errors";
import { deleteMedia, getMedia, uploadMedia } from "@/server/media/service";
import {
  archiveProject,
  createProject,
  deleteProject,
  duplicateProject,
  getProject,
  listProjects,
  publishProject,
  reorderProjects,
  restoreProject,
  setFeatured,
  unpublishProject,
  updateProject,
} from "@/server/projects/service";
import { getPublicProject, getPublishedProjects } from "@/server/projects/public";
import { projectInputSchema, slugify, suggestTone, type ProjectInput } from "@/lib/validation/projects";
import { createUser, resetTestDatabase } from "../support/db";

const ctx = { ip: "203.0.113.50", userAgent: "vitest" };
let actor: { id: string; email: string };
let cover: string;

async function expectStatus(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  return error as HttpError;
}

const base = (over: Partial<ProjectInput> = {}): ProjectInput => ({
  name: "Projeto Teste",
  slug: "projeto-teste",
  client: "",
  category: "Sistema",
  projectDate: "2026-03-10",
  summary: "Resumo do projeto de teste.",
  description: "",
  context: "",
  solution: "",
  results: "",
  services: ["Sistema web"],
  highlights: [],
  brandColor: "#0b1f1d",
  accentColor: "#2dd4bf",
  tone: "light",
  coverMediaId: cover,
  logoMediaId: null,
  ogMediaId: null,
  desktopMediaId: null,
  phoneMediaIds: [],
  gallery: [],
  externalUrl: "",
  seoTitle: "",
  seoDescription: "",
  featured: false,
  ...over,
});

const version = async (id: string) => (await getProject(id))!.row.version;

beforeAll(async () => {
  await resetTestDatabase();
  const user = await createUser(getDb(), { email: "projetos@teste.local", roleKey: "editor", password: "uma senha longa e boa 42" });
  actor = { id: user.id, email: user.email };
});

beforeEach(async () => {
  await getDb().execute(sql`TRUNCATE media_usages, audit_logs, project_images`);
  await getDb().execute(sql`DELETE FROM projects`);
  await getDb().execute(sql`DELETE FROM media`);
  const buffer = await sharp({ create: { width: 320, height: 200, channels: 3, background: "#335577" } }).jpeg().toBuffer();
  cover = (await uploadMedia(actor, { buffer, filename: "capa.jpg", alt: "Capa do projeto" }, ctx)).media.id;
});

describe("ciclo de vida", () => {
  it("rascunho não aparece no site; publicar, editar e republicar", async () => {
    const { id } = await createProject(actor, base(), ctx);
    expect(await getPublicProject("projeto-teste")).toBeNull();
    expect(await getPublishedProjects()).toHaveLength(0);

    await publishProject(actor, id, await version(id), ctx);
    const published = await getPublicProject("projeto-teste");
    expect(published?.name).toBe("Projeto Teste");
    expect(published?.year).toBe("2026");
    expect(typeof published?.cover?.src).toBe("string");

    // Editar não muda o site até publicar de novo.
    await updateProject(actor, id, base({ name: "Nome Novo" }), await version(id), ctx);
    expect((await getPublicProject("projeto-teste"))?.name).toBe("Projeto Teste");
    expect((await getProject(id))?.hasChanges).toBe(true);

    await publishProject(actor, id, await version(id), ctx);
    expect((await getPublicProject("projeto-teste"))?.name).toBe("Nome Novo");
    expect((await getProject(id))?.hasChanges).toBe(false);
  });

  it("despublicar e arquivar tiram do ar (404) e apagam o snapshot", async () => {
    const { id } = await createProject(actor, base(), ctx);
    await publishProject(actor, id, await version(id), ctx);
    await unpublishProject(actor, id, await version(id), ctx);
    expect(await getPublicProject("projeto-teste")).toBeNull();
    expect((await getProject(id))?.row.publishedSnapshot).toBeNull();

    await publishProject(actor, id, await version(id), ctx);
    await archiveProject(actor, id, await version(id), ctx);
    expect(await getPublicProject("projeto-teste")).toBeNull();
    await expectStatus(publishProject(actor, id, await version(id), ctx), 409);
    await restoreProject(actor, id, await version(id), ctx);
    expect((await getProject(id))?.row.status).toBe("draft");
  });

  it("trocar o endereço de um publicado mantém o antigo até republicar", async () => {
    const { id } = await createProject(actor, base(), ctx);
    await publishProject(actor, id, await version(id), ctx);
    await updateProject(actor, id, base({ slug: "novo-endereco" }), await version(id), ctx);
    expect(await getPublicProject("projeto-teste")).not.toBeNull();
    expect(await getPublicProject("novo-endereco")).toBeNull();
    await publishProject(actor, id, await version(id), ctx);
    expect(await getPublicProject("projeto-teste")).toBeNull();
    expect(await getPublicProject("novo-endereco")).not.toBeNull();
  });

  it("recusa publicar com texto ilegível sobre a cor da marca", async () => {
    const { id } = await createProject(actor, base({ brandColor: "#f4f1ea", tone: "light" }), ctx);
    const error = await expectStatus(publishProject(actor, id, await version(id), ctx), 422);
    expect(error.extra?.fields).toHaveProperty("tone");
    await updateProject(actor, id, base({ brandColor: "#f4f1ea", tone: "dark" }), await version(id), ctx);
    await publishProject(actor, id, await version(id), ctx);
  });

  it("exige imagem para publicar", async () => {
    const { id } = await createProject(actor, base({ coverMediaId: null }), ctx);
    const error = await expectStatus(publishProject(actor, id, await version(id), ctx), 422);
    expect(error.extra?.fields).toHaveProperty("coverMediaId");
  });
});

describe("integridade", () => {
  it("endereço único, inclusive contra o endereço publicado de outro projeto", async () => {
    const a = await createProject(actor, base(), ctx);
    await expectStatus(createProject(actor, base({ name: "Outro" }), ctx), 409);

    await publishProject(actor, a.id, await version(a.id), ctx);
    await updateProject(actor, a.id, base({ slug: "renomeado" }), await version(a.id), ctx);
    // "projeto-teste" continua sendo a URL pública de A: ninguém pode ocupá-la.
    await expectStatus(createProject(actor, base({ name: "Intruso" }), ctx), 409);
  });

  it("concorrência otimista (409 com versão antiga)", async () => {
    const { id } = await createProject(actor, base(), ctx);
    const v = await version(id);
    await updateProject(actor, id, base({ name: "Primeira" }), v, ctx);
    const error = await expectStatus(updateProject(actor, id, base({ name: "Segunda" }), v, ctx), 409);
    expect(error.code).toBe("stale");
  });

  it("imagem usada no projeto não pode ser removida da biblioteca", async () => {
    const { id } = await createProject(actor, base(), ctx);
    await publishProject(actor, id, await version(id), ctx);
    const usages = (await getMedia(cover))?.usages.map((u) => u.label).sort();
    expect(usages).toEqual(["Projeto Projeto Teste · Capa (publicado)", "Projeto Projeto Teste · Capa (rascunho)"]);
    await expectStatus(deleteMedia(actor, cover, ctx), 409);
  });

  it("exclusão só de arquivado e com o endereço digitado", async () => {
    const { id } = await createProject(actor, base(), ctx);
    await expectStatus(deleteProject(actor, id, await version(id), "projeto-teste", ctx), 409);
    await archiveProject(actor, id, await version(id), ctx);
    await expectStatus(deleteProject(actor, id, await version(id), "errado", ctx), 422);
    await deleteProject(actor, id, await version(id), "projeto-teste", ctx);
    expect(await getProject(id)).toBeNull();
    // A imagem deixou de estar em uso e pode ser removida.
    await deleteMedia(actor, cover, ctx);
    const actions = (await getDb().select({ a: schema.auditLogs.action }).from(schema.auditLogs)).map((r) => r.a);
    expect(actions).toContain("project.deleted");
  });

  it("duplicar cria rascunho com endereço livre e as mesmas imagens", async () => {
    const { id } = await createProject(actor, base({ phoneMediaIds: [cover] }), ctx);
    const first = await duplicateProject(actor, id, ctx);
    const second = await duplicateProject(actor, id, ctx);
    expect(first.slug).toBe("projeto-teste-copia");
    expect(second.slug).toBe("projeto-teste-copia-2");
    const copy = await getProject(first.id);
    expect(copy?.row.status).toBe("draft");
    expect(copy?.input.phoneMediaIds).toEqual([cover]);
  });

  it("ordem e destaque valem na vitrine", async () => {
    const a = await createProject(actor, base({ slug: "a", name: "A" }), ctx);
    const b = await createProject(actor, base({ slug: "b", name: "B" }), ctx);
    const c = await createProject(actor, base({ slug: "c", name: "C" }), ctx);
    for (const p of [a, b, c]) await publishProject(actor, p.id, await version(p.id), ctx);

    await reorderProjects(actor, [c.id, a.id, b.id], ctx);
    expect((await getPublishedProjects()).map((p) => p.slug)).toEqual(["c", "a", "b"]);
    await setFeatured(actor, b.id, true, ctx);
    expect((await getPublishedProjects()).map((p) => p.slug)).toEqual(["b", "c", "a"]);
    // Destaque não conta como alteração pendente de publicação.
    expect((await getProject(b.id))?.hasChanges).toBe(false);
  });

  it("busca e filtro por status", async () => {
    await createProject(actor, base({ slug: "loja-x", name: "Loja X", category: "Loja virtual" }), ctx);
    const s = await createProject(actor, base({ slug: "sistema-y", name: "Sistema Y" }), ctx);
    await publishProject(actor, s.id, await version(s.id), ctx);
    expect((await listProjects({ q: "loja" })).map((p) => p.slug)).toEqual(["loja-x"]);
    expect((await listProjects({ status: "published" })).map((p) => p.slug)).toEqual(["sistema-y"]);
    expect(await listProjects({ q: "%" })).toHaveLength(0);
  });
});

describe("validação", () => {
  it("recusa endereço, cor e link inválidos, e travessão", () => {
    const bad = (over: Partial<ProjectInput>) => projectInputSchema.safeParse(base(over)).success;
    expect(bad({ slug: "Com Espaço" })).toBe(false);
    expect(bad({ slug: "../x" })).toBe(false);
    expect(bad({ brandColor: "red" })).toBe(false);
    expect(bad({ externalUrl: "javascript:alert(1)" })).toBe(false);
    expect(bad({ externalUrl: "http://sem-tls.com" })).toBe(false);
    expect(bad({ summary: "Resumo \u2014 com travessão" })).toBe(false);
    expect(bad({})).toBe(true);
  });

  it("gera endereço e sugere o tom do texto pelo contraste", () => {
    expect(slugify("Clínica Vitta & Cia.")).toBe("clinica-vitta-cia");
    expect(suggestTone("#0b1f1d")).toBe("light");
    expect(suggestTone("#ece3d8")).toBe("dark");
  });

  it("o banco recusa dois projetos publicados com o mesmo endereço público", async () => {
    const a = await createProject(actor, base({ slug: "um" }), ctx);
    const b = await createProject(actor, base({ slug: "dois" }), ctx);
    await publishProject(actor, a.id, await version(a.id), ctx);
    await publishProject(actor, b.id, await version(b.id), ctx);
    const snapshotA = (await getProject(a.id))!.row.publishedSnapshot;
    const clash = getDb().update(schema.projects).set({ publishedSnapshot: snapshotA }).where(eq(schema.projects.id, b.id));
    await expect(clash).rejects.toThrow();
  });
});
