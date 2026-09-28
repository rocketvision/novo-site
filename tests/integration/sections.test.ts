import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { HttpError } from "@/server/http/errors";
import { discardDraft, getSectionState, publishSection, saveDraft } from "@/server/content/sections";
import { assertSectionPermission, isPreviewPath } from "@/server/content/access";
import { deleteMedia, getMedia, uploadMedia } from "@/server/media/service";
import { DEFAULT_CONTENT } from "@/lib/content/defaults";
import type { SessionUser } from "@/server/auth/session";
import type { Permission } from "@/server/authz/permissions";
import { createUser, resetTestDatabase } from "../support/db";

const ctx = { ip: "203.0.113.40", userAgent: "vitest" };
let actor: { id: string; email: string };

async function expectStatus(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  return error as HttpError;
}

const hero = () => structuredClone(DEFAULT_CONTENT.hero);

beforeAll(async () => {
  await resetTestDatabase();
  const user = await createUser(getDb(), { email: "secoes@teste.local", roleKey: "editor", password: "uma senha longa e boa 42" });
  actor = { id: user.id, email: user.email };
});

beforeEach(async () => {
  // Volta todas as seções ao estado do seed: rascunho = publicado = conteúdo padrão.
  await getDb().execute(sql`TRUNCATE media_usages, audit_logs`);
  await getDb().execute(sql`DELETE FROM media`);
  await getDb().execute(sql`UPDATE content_sections SET draft = published, version = 1`);
});

describe("rascunho e publicação", () => {
  it("salvar o rascunho não muda o publicado", async () => {
    const state = await getSectionState("hero");
    expect(state.hasChanges).toBe(false);

    const draft = { ...hero(), eyebrow: "Novo rótulo de teste" };
    const { version } = await saveDraft(actor, "hero", draft, state.version, ctx);
    expect(version).toBe(state.version + 1);

    const after = await getSectionState("hero");
    expect(after.draft.eyebrow).toBe("Novo rótulo de teste");
    expect(after.published?.eyebrow).toBe(DEFAULT_CONTENT.hero.eyebrow);
    expect(after.hasChanges).toBe(true);
  });

  it("publicar copia o rascunho validado e registra o que mudou", async () => {
    const state = await getSectionState("hero");
    const saved = await saveDraft(actor, "hero", { ...hero(), lead: "Descrição publicada no teste." }, state.version, ctx);
    await publishSection(actor, "hero", saved.version, ctx);

    const after = await getSectionState("hero");
    expect(after.published?.lead).toBe("Descrição publicada no teste.");
    expect(after.hasChanges).toBe(false);

    const [log] = await getDb().select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "section.published"));
    expect(log.changes).toEqual({ lead: { before: DEFAULT_CONTENT.hero.lead, after: "Descrição publicada no teste." } });
  });

  it("descartar volta o rascunho para o publicado", async () => {
    const state = await getSectionState("turn");
    const saved = await saveDraft(actor, "turn", { from: "Tecnologia não deveria travar a sua empresa.", strike: "travar", to: "Deveria fazer ela avançar." }, state.version, ctx);
    await discardDraft(actor, "turn", saved.version, ctx);
    const after = await getSectionState("turn");
    expect(after.draft).toEqual(after.published);
  });

  it("recusa gravar sobre uma versão desatualizada (409)", async () => {
    const state = await getSectionState("hero");
    await saveDraft(actor, "hero", { ...hero(), eyebrow: "Primeira pessoa" }, state.version, ctx);
    const error = await expectStatus(saveDraft(actor, "hero", { ...hero(), eyebrow: "Segunda pessoa" }, state.version, ctx), 409);
    expect(error.code).toBe("stale");
    expect((await getSectionState("hero")).draft.eyebrow).toBe("Primeira pessoa");

    await expectStatus(publishSection(actor, "hero", state.version, ctx), 409);
  });
});

describe("validação no servidor", () => {
  it("recusa conteúdo inválido com erro por campo", async () => {
    const state = await getSectionState("hero");
    const error = await expectStatus(saveDraft(actor, "hero", { ...hero(), lead: "" }, state.version, ctx), 422);
    expect(error.extra?.fields).toHaveProperty("lead");
  });

  it("recusa travessão", async () => {
    const state = await getSectionState("hero");
    const error = await expectStatus(saveDraft(actor, "hero", { ...hero(), eyebrow: "Sites \u2014 apps" }, state.version, ctx), 422);
    expect(error.extra?.fields?.eyebrow).toMatch(/travessão/);
  });

  it("recusa links perigosos", async () => {
    const state = await getSectionState("hero");
    for (const href of ["javascript:alert(1)", "//evil.com", "http://sem-tls.com", "data:text/html,oi"]) {
      await expectStatus(saveDraft(actor, "hero", { ...hero(), primaryCta: { label: "Ok", href } }, state.version, ctx), 422);
    }
  });

  it("descarta campos fora do schema (sem mass assignment)", async () => {
    const state = await getSectionState("hero");
    await saveDraft(actor, "hero", { ...hero(), injected: "<script>", version: 999 }, state.version, ctx);
    const [row] = await getDb().select().from(schema.contentSections).where(eq(schema.contentSections.key, "hero"));
    expect(row.draft).not.toHaveProperty("injected");
    expect(row.version).toBe(state.version + 1);
  });

  it("só aceita as fotos originais conhecidas como fallback", async () => {
    const state = await getSectionState("hero");
    const draft = { ...hero(), image: { mediaId: null, alt: "", fallback: "../../etc/passwd" } };
    await expectStatus(saveDraft(actor, "hero", draft, state.version, ctx), 422);
  });

  it("a palavra riscada precisa existir na frase", async () => {
    const state = await getSectionState("turn");
    const error = await expectStatus(saveDraft(actor, "turn", { from: "Uma frase qualquer.", strike: "inexistente", to: "Outra." }, state.version, ctx), 422);
    expect(error.extra?.fields).toHaveProperty("strike");
  });
});

describe("uso de mídia", () => {
  it("registra onde a imagem é usada e impede removê-la", async () => {
    const buffer = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#224466" } }).jpeg().toBuffer();
    const { media } = await uploadMedia(actor, { buffer, filename: "hero.jpg" }, ctx);

    const state = await getSectionState("hero");
    const saved = await saveDraft(actor, "hero", { ...hero(), image: { mediaId: media.id, alt: "Nova foto", fallback: "hero" } }, state.version, ctx);
    let detail = await getMedia(media.id);
    expect(detail?.usages.map((u) => u.label)).toEqual(["Hero · Imagem (rascunho)"]);

    await publishSection(actor, "hero", saved.version, ctx);
    detail = await getMedia(media.id);
    expect(detail?.usages.map((u) => u.label).sort()).toEqual(["Hero · Imagem (publicado)", "Hero · Imagem (rascunho)"]);

    await expectStatus(deleteMedia(actor, media.id, ctx), 409);
  });
});

describe("permissões", () => {
  const user = (permissions: Permission[]): SessionUser => ({
    id: "x",
    email: "x@x",
    name: "x",
    roleId: "r",
    roleKey: "r",
    roleName: "r",
    permissions: new Set(permissions),
  });

  it("seções da landing usam permissões de landing; site usa as de configurações", () => {
    const editor = user(["landing.view", "landing.edit", "settings.view"]);
    expect(() => assertSectionPermission(editor, "hero", "edit")).not.toThrow();
    expect(() => assertSectionPermission(editor, "hero", "publish")).toThrow(HttpError);
    expect(() => assertSectionPermission(editor, "site", "view")).not.toThrow();
    expect(() => assertSectionPermission(editor, "site", "edit")).toThrow(HttpError);
    expect(() => assertSectionPermission(editor, "inexistente", "view")).toThrow(/não encontrada/);
  });

  it("pré-visualização só abre páginas do site", () => {
    expect(isPreviewPath("/")).toBe(true);
    expect(isPreviewPath("/projetos/app-agenda")).toBe(true);
    for (const path of ["//evil.com", "https://evil.com", "/cms", "/api/cms/media", "/\\evil.com", "javascript:alert(1)"]) {
      expect(isPreviewPath(path)).toBe(false);
    }
  });
});
