import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { eq, sql } from "drizzle-orm";

// Fora do Next não há cache de dados nem requisição: leitura direta e sem pré-visualização.
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: () => {} }));
vi.mock("next/headers", () => ({ draftMode: async () => ({ isEnabled: false }), cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));

import { getDb, schema } from "@/server/db";
import { HttpError } from "@/server/http/errors";
import { createSession, validateSessionToken, type SessionUser } from "@/server/auth/session";
import { uploadMedia } from "@/server/media/service";
import {
  addComment,
  createArticle,
  deleteArticle,
  getArticleForEditor,
  listArticles,
  publishDueArticles,
  restoreRevision,
  transitionArticle,
  updateArticle,
  updateOwnAuthor,
} from "@/server/blog/service";
import { getPublicArticle, getPublishedCards, searchArticles } from "@/server/blog/public";
import { articleInputSchema, type ArticleInput } from "@/lib/validation/blog";
import type { BlogDocument } from "@/lib/blog/document";
import type { BlogAction } from "@/lib/blog/workflow";
import { createUser, resetTestDatabase } from "../support/db";

const ctx = { ip: "203.0.113.60", userAgent: "vitest" };
let admin: SessionUser;
let columnist: SessionUser;
let otherColumnist: SessionUser;
let categoryId: string;
let adminCover: string;
let columnistCover: string;

async function expectStatus(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((e) => e);
  expect(error, String(error)).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  return error as HttpError;
}

async function actorFor(email: string, roleKey: string, name: string): Promise<SessionUser> {
  const user = await createUser(getDb(), { email, roleKey, name, password: "senha-de-teste-longa-1" });
  const { token } = await createSession(user.id, ctx);
  return (await validateSessionToken(token))!.user;
}

async function png(seed: number) {
  return sharp({ create: { width: 64, height: 36, channels: 3, background: { r: seed, g: 90, b: 40 } } }).png().toBuffer();
}

const words = (n: number) => Array.from({ length: n }, (_, i) => `palavra${i}`).join(" ");
const doc = (text = words(200)): BlogDocument => ({
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Contexto" }] },
    { type: "paragraph", content: [{ type: "text", text }] },
  ],
});

const base = (over: Partial<ArticleInput> = {}): ArticleInput => ({
  title: "Zero Trust na prática",
  slug: "zero-trust-na-pratica",
  subtitle: "",
  excerpt: "Um resumo com mais de quarenta caracteres para o artigo de teste.",
  content: doc(),
  categoryId,
  authorId: null,
  coverMediaId: columnistCover,
  coverAlt: "Diagrama de verificação contínua",
  coverCaption: "",
  seoTitle: "",
  seoDescription: "",
  featured: false,
  ...over,
});

const versionOf = async (id: string) => (await getDb().select({ v: schema.blogArticles.version }).from(schema.blogArticles).where(eq(schema.blogArticles.id, id)))[0].v;
const statusOf = async (id: string) => (await getDb().select({ s: schema.blogArticles.status }).from(schema.blogArticles).where(eq(schema.blogArticles.id, id)))[0].s;

async function act(user: SessionUser, id: string, action: BlogAction, extra: { comment?: string; scheduledAt?: string } = {}) {
  return transitionArticle(user, id, action, { version: await versionOf(id), ...extra }, ctx);
}

beforeAll(async () => {
  await resetTestDatabase();
  admin = await actorFor("admin-blog@rocketvision.dev", "admin", "Admin Blog");
  columnist = await actorFor("colunista@exemplo.com", "columnist", "Ana Colunista");
  otherColumnist = await actorFor("outra@exemplo.com", "columnist", "Bia Colunista");
  const [cat] = await getDb().select().from(schema.blogCategories).where(eq(schema.blogCategories.slug, "ciberseguranca"));
  categoryId = cat.id;
  adminCover = (await uploadMedia(admin, { buffer: await png(10), filename: "admin.png", alt: "Capa do admin" }, ctx)).media.id;
  columnistCover = (await uploadMedia(columnist, { buffer: await png(200), filename: "col.png", alt: "Capa da colunista" }, ctx)).media.id;
});

beforeEach(async () => {
  await getDb().delete(schema.mediaUsages).where(eq(schema.mediaUsages.resourceType, "blog_article"));
  await getDb().delete(schema.blogArticles);
});

describe("Colunista", () => {
  it("tem só as permissões de autor", () => {
    expect([...columnist.permissions].sort()).toEqual(["blog.create", "blog.edit_own", "blog.view"]);
  });

  it("cria o próprio artigo assinado pelo perfil de convidado", async () => {
    const { id } = await createArticle(columnist, base(), ctx);
    const [row] = await getDb().select().from(schema.blogArticles).where(eq(schema.blogArticles.id, id));
    const [author] = await getDb().select().from(schema.blogAuthors).where(eq(schema.blogAuthors.id, row.authorId!));
    expect(author.userId).toBe(columnist.id);
    expect(author.affiliation).toBe("guest");
    expect(row.status).toBe("draft");
    expect(row.readingMinutes).toBe(1);
  });

  it("não assina como outra pessoa (author_id forjado)", async () => {
    const [redacao] = await getDb().select().from(schema.blogAuthors).where(eq(schema.blogAuthors.slug, "redacao-rocket-vision"));
    await expectStatus(createArticle(columnist, base({ authorId: redacao.id }), ctx), 403);
  });

  it("não vê nem edita o artigo de outra pessoa (404)", async () => {
    const { id } = await createArticle(columnist, base(), ctx);
    expect(await getArticleForEditor(otherColumnist, id)).toBeNull();
    await expectStatus(updateArticle(otherColumnist, id, base({ title: "Invasão" }), 1, ctx), 404);
    await expectStatus(act(otherColumnist, id, "submit"), 404);
    await expectStatus(addComment(otherColumnist, id, "oi", ctx), 404);
    expect((await listArticles(otherColumnist, {})).map((a) => a.id)).not.toContain(id);
    expect((await listArticles(admin, {})).map((a) => a.id)).toContain(id);
  });

  it("não usa imagem enviada por outra pessoa", async () => {
    await expectStatus(createArticle(columnist, base({ coverMediaId: adminCover }), ctx), 403);
  });

  it("não aprova nem publica, e não edita depois de aprovado", async () => {
    const { id } = await createArticle(columnist, base(), ctx);
    await act(columnist, id, "submit");
    await expectStatus(act(columnist, id, "approve"), 403);
    await act(admin, id, "approve");
    await expectStatus(act(columnist, id, "publish"), 403);
    await expectStatus(updateArticle(columnist, id, base({ title: "Mudança" }), await versionOf(id), ctx), 403);
  });

  it("edita o próprio perfil de autor", async () => {
    const author = await updateOwnAuthor(columnist, { name: "Ana C.", roleTitle: "Especialista em segurança", bio: "Bio.", photoMediaId: columnistCover, links: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/exemplo" }] }, null, ctx);
    expect(author.name).toBe("Ana C.");
    await expectStatus(updateOwnAuthor(columnist, { name: "Ana", roleTitle: "", bio: "", photoMediaId: adminCover, links: [] }, author.version, ctx), 403);
  });
});

describe("fluxo editorial", () => {
  it("rascunho, revisão, devolução, aprovação, publicação, edição e despublicação", async () => {
    const { id } = await createArticle(columnist, base(), ctx);
    await act(columnist, id, "submit");
    expect(await statusOf(id)).toBe("in_review");

    await expectStatus(act(admin, id, "request_changes"), 422);
    await act(admin, id, "request_changes", { comment: "Inclua as fontes." });
    expect(await statusOf(id)).toBe("draft");
    const editor = await getArticleForEditor(columnist, id);
    expect(editor?.comments.at(-1)).toMatchObject({ kind: "changes_requested", body: "Inclua as fontes." });

    await updateArticle(columnist, id, base({ subtitle: "Com fontes" }), await versionOf(id), ctx);
    await act(columnist, id, "submit");
    await act(admin, id, "approve");
    expect(await getPublicArticle("zero-trust-na-pratica")).toBeNull();

    await act(admin, id, "publish");
    const published = await getPublicArticle("zero-trust-na-pratica");
    expect(published?.subtitle).toBe("Com fontes");
    expect(published?.author.affiliation).toBe("guest");
    expect(published?.toc).toEqual([{ id: "contexto", text: "Contexto", level: 2 }]);

    // Editar um artigo no ar não muda o site até publicar de novo.
    await updateArticle(admin, id, base({ subtitle: "Versão nova" }), await versionOf(id), ctx);
    expect((await getPublicArticle("zero-trust-na-pratica"))?.subtitle).toBe("Com fontes");
    expect((await getArticleForEditor(admin, id))?.hasChanges).toBe(true);
    await act(admin, id, "publish");
    const republished = await getPublicArticle("zero-trust-na-pratica");
    expect(republished?.subtitle).toBe("Versão nova");
    expect(republished?.updatedAt).not.toBe(republished?.publishedAt);

    await act(admin, id, "unpublish");
    expect(await getPublicArticle("zero-trust-na-pratica")).toBeNull();
    expect(await statusOf(id)).toBe("approved");
  });

  it("não publica sem capa, categoria e texto suficientes", async () => {
    const { id } = await createArticle(admin, base({ coverMediaId: null, categoryId: null, content: doc(words(40)) }), ctx);
    await act(admin, id, "submit");
    await act(admin, id, "approve");
    const error = await expectStatus(act(admin, id, "publish"), 422);
    expect(Object.keys(error.extra?.fields ?? {}).sort()).toEqual(["categoryId", "content", "coverMediaId"]);
  });

  it("recusa ação fora de ordem (409) e versão desatualizada (409)", async () => {
    const { id } = await createArticle(admin, base(), ctx);
    await expectStatus(act(admin, id, "publish"), 409);
    await expectStatus(transitionArticle(admin, id, "submit", { version: 99 }, ctx), 409);
  });

  it("recusa endereço repetido (409)", async () => {
    await createArticle(admin, base(), ctx);
    await expectStatus(createArticle(admin, base({ title: "Outro" }), ctx), 409);
  });

  it("agenda e publica no horário, sem depender do navegador", async () => {
    const { id } = await createArticle(admin, base(), ctx);
    await act(admin, id, "submit");
    await act(admin, id, "approve");
    await expectStatus(act(admin, id, "schedule", { scheduledAt: new Date(Date.now() - 1000).toISOString() }), 422);
    await act(admin, id, "schedule", { scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString() });
    expect(await statusOf(id)).toBe("scheduled");
    expect(await getPublicArticle("zero-trust-na-pratica")).toBeNull();

    expect((await publishDueArticles()).published).toEqual([]);
    const later = new Date(Date.now() + 10 * 60_000);
    expect((await publishDueArticles(later)).published).toEqual([id]);
    // Idempotente: rodar de novo não faz nada.
    expect((await publishDueArticles(later)).published).toEqual([]);
    expect(await statusOf(id)).toBe("published");
    expect((await getPublicArticle("zero-trust-na-pratica"))?.title).toBe("Zero Trust na prática");
  });

  it("agendamento que não pode mais ser publicado volta para aprovado com um comentário", async () => {
    const { id } = await createArticle(admin, base(), ctx);
    await act(admin, id, "submit");
    await act(admin, id, "approve");
    await act(admin, id, "schedule", { scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString() });
    await getDb().update(schema.blogAuthors).set({ isActive: false }).where(sql`${schema.blogAuthors.id} = (select author_id from blog_articles where id = ${id})`);
    const result = await publishDueArticles(new Date(Date.now() + 10 * 60_000));
    expect(result.failed).toEqual([id]);
    expect(await statusOf(id)).toBe("approved");
    await getDb().update(schema.blogAuthors).set({ isActive: true });
  });

  it("guarda revisões e restaura sem apagar o histórico", async () => {
    const { id } = await createArticle(admin, base({ title: "Primeira versão" }), ctx);
    await updateArticle(admin, id, base({ title: "Segunda versão" }), await versionOf(id), ctx);
    const editor = await getArticleForEditor(admin, id);
    const first = editor!.revisions.find((r) => r.reason === "create")!;
    await restoreRevision(admin, id, first.id, await versionOf(id), ctx);
    const after = await getArticleForEditor(admin, id);
    expect(after?.input.title).toBe("Primeira versão");
    expect(after?.revisions.map((r) => r.reason)).toEqual(["restore", "save", "create"]);
  });

  it("exclui só rascunho ou arquivado, com confirmação", async () => {
    const { id } = await createArticle(admin, base(), ctx);
    await expectStatus(deleteArticle(admin, id, await versionOf(id), "errado", ctx), 422);
    await deleteArticle(admin, id, await versionOf(id), "zero-trust-na-pratica", ctx);
    expect(await getArticleForEditor(admin, id)).toBeNull();
  });
});

describe("site público", () => {
  it("rascunho, revisão e agendado não aparecem na lista nem na busca", async () => {
    const draft = await createArticle(admin, base({ slug: "rascunho-secreto", title: "Rascunho secreto" }), ctx);
    const pub = await createArticle(admin, base({ slug: "publicado-aberto", title: "Segurança publicada" }), ctx);
    await act(admin, pub.id, "submit");
    await act(admin, pub.id, "approve");
    await act(admin, pub.id, "publish");

    const cards = await getPublishedCards();
    expect(cards.map((c) => c.slug)).toEqual(["publicado-aberto"]);
    expect(await getPublicArticle("rascunho-secreto")).toBeNull();
    expect(await getPublicArticle("nao-existe")).toBeNull();
    expect(await getPublicArticle("../etc")).toBeNull();
    // Busca sem acento encontra texto com acento; o rascunho não aparece.
    expect((await searchArticles("seguranca")).map((c) => c.slug)).toEqual(["publicado-aberto"]);
    expect(await searchArticles("secreto")).toEqual([]);
    void draft;
  });
});

describe("validação da entrada", () => {
  it("o schema da API recusa HTML no conteúdo e travessão no título", () => {
    expect(articleInputSchema.safeParse({ ...base(), content: "<p>oi</p>" }).success).toBe(false);
    expect(articleInputSchema.safeParse({ ...base(), title: "Isto — aquilo" }).success).toBe(false);
  });
});
