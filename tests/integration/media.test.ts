import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { HttpError } from "@/server/http/errors";
import { processImage } from "@/server/media/process";
import { deleteMedia, getMedia, listMedia, replaceMedia, syncMediaUsages, updateMedia, uploadMedia } from "@/server/media/service";
import { createUser, resetTestDatabase } from "../support/db";

const ctx = { ip: "203.0.113.30", userAgent: "vitest" };
let actor: { id: string; email: string };

const solid = (width: number, height: number, color = "#3366ff") =>
  sharp({ create: { width, height, channels: 3, background: color } });

const jpeg = (w = 120, h = 80, color?: string) => solid(w, h, color).jpeg().toBuffer();
const png = (w = 120, h = 80, color?: string) => solid(w, h, color).png().toBuffer();

async function expectStatus(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  return error as HttpError;
}

const localPath = (url: string) => join(process.env.MEDIA_LOCAL_DIR!, url.replace(/^\/uploads\//, ""));

beforeAll(async () => {
  await resetTestDatabase();
  const user = await createUser(getDb(), { email: "midia@teste.local", roleKey: "editor", password: "uma senha longa e boa 42" });
  actor = { id: user.id, email: user.email };
});

beforeEach(async () => {
  await getDb().execute(sql`TRUNCATE media_usages, audit_logs`);
  await getDb().execute(sql`DELETE FROM media`);
});

describe("validação de imagem", () => {
  it("detecta o tipo pelos bytes, não pela extensão", async () => {
    await expectStatus(processImage(Buffer.from("isto não é uma imagem, só texto com nome .jpg")), 415);
  });

  it("recusa SVG", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><script>alert(1)</script></svg>');
    await expectStatus(processImage(svg), 415);
  });

  it("recusa GIF (fora da lista de formatos aceitos)", async () => {
    const gif = await solid(40, 40).gif().toBuffer();
    await expectStatus(processImage(gif), 415);
  });

  it("recusa arquivo vazio e imagem pequena demais", async () => {
    await expectStatus(processImage(Buffer.alloc(0)), 422);
    await expectStatus(processImage(await png(8, 8)), 422);
  });

  it("recusa imagem truncada", async () => {
    const full = await jpeg(400, 300);
    await expectStatus(processImage(full.subarray(0, 200)), 422);
  });

  it("recusa imagens com pixels demais (bomba de descompressão)", async () => {
    const huge = await sharp({ create: { width: 10000, height: 6000, channels: 3, background: "#000" } }).png({ compressionLevel: 9 }).toBuffer();
    await expectStatus(processImage(huge), 422);
  });

  it("remove metadados EXIF e aplica a orientação", async () => {
    const withExif = await solid(200, 100)
      .jpeg()
      .withExif({ IFD0: { Copyright: "Pessoa", Artist: "Câmera" } })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const out = await processImage(withExif);
    const meta = await sharp(out.buffer).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation ?? 1).toBe(1);
    expect([out.width, out.height]).toEqual([100, 200]);
    expect(out.mime).toBe("image/jpeg");
    expect(out.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
  });

  it("reduz imagens enormes para no máximo 2560 px e converte AVIF em WebP", async () => {
    const big = await processImage(await solid(4000, 1000).jpeg().toBuffer());
    expect([big.width, big.height]).toEqual([2560, 640]);

    const avif = await processImage(await solid(64, 64).avif().toBuffer());
    expect(avif.mime).toBe("image/webp");
  });
});

describe("biblioteca de mídia", () => {
  it("envia, grava o arquivo no storage e registra na auditoria", async () => {
    const { media, duplicate } = await uploadMedia(actor, { buffer: await jpeg(), filename: "../../etc/foto<1>.jpg", alt: "Foto de teste" }, ctx);
    expect(duplicate).toBe(false);
    expect(media.filename).toBe("foto1.jpg");
    expect(media.url).toMatch(/^\/uploads\/media\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/);
    expect(existsSync(localPath(media.url))).toBe(true);

    const logs = await getDb().select().from(schema.auditLogs);
    expect(logs.map((l) => l.action)).toEqual(["media.uploaded"]);
  });

  it("não duplica a mesma imagem", async () => {
    const buffer = await jpeg(90, 90, "#aa0000");
    const first = await uploadMedia(actor, { buffer, filename: "a.jpg" }, ctx);
    const second = await uploadMedia(actor, { buffer, filename: "b.jpg" }, ctx);
    expect(second.duplicate).toBe(true);
    expect(second.media.id).toBe(first.media.id);
  });

  it("edita o texto alternativo com concorrência otimista", async () => {
    const { media } = await uploadMedia(actor, { buffer: await png(), filename: "x.png" }, ctx);
    const updated = await updateMedia(actor, media.id, { alt: "Novo alt", filename: "x.png", expectedUpdatedAt: media.updatedAt.toISOString() }, ctx);
    expect(updated.alt).toBe("Novo alt");

    // Segunda gravação com a versão antiga: 409, sem sobrescrever.
    await expectStatus(updateMedia(actor, media.id, { alt: "Outro", filename: "x.png", expectedUpdatedAt: media.updatedAt.toISOString() }, ctx), 409);
    expect((await getMedia(media.id))?.alt).toBe("Novo alt");
  });

  it("substitui o arquivo mantendo o id e apaga o antigo", async () => {
    const { media } = await uploadMedia(actor, { buffer: await jpeg(100, 100, "#00aa00"), filename: "v1.jpg" }, ctx);
    const replaced = await replaceMedia(actor, media.id, { buffer: await png(300, 200, "#0000aa"), filename: "v2.png" }, media.updatedAt.toISOString(), ctx);
    expect(replaced.id).toBe(media.id);
    expect([replaced.width, replaced.height, replaced.mimeType]).toEqual([300, 200, "image/png"]);
    expect(existsSync(localPath(media.url))).toBe(false);
    expect(existsSync(localPath(replaced.url))).toBe(true);
  });

  it("não remove imagem em uso e informa onde ela aparece", async () => {
    const { media } = await uploadMedia(actor, { buffer: await jpeg(70, 70, "#123456"), filename: "hero.jpg" }, ctx);
    await getDb().transaction((tx) => syncMediaUsages(tx, "section", "hero", [{ mediaId: media.id, field: "draft.image", label: "Hero · Imagem (rascunho)" }]));

    const error = await expectStatus(deleteMedia(actor, media.id, ctx), 409);
    expect(error.extra?.details).toEqual({ usages: [expect.objectContaining({ resourceType: "section", resourceId: "hero", label: "Hero · Imagem (rascunho)" })] });

    await getDb().transaction((tx) => syncMediaUsages(tx, "section", "hero", []));
    await deleteMedia(actor, media.id, ctx);
    expect(await getMedia(media.id)).toBeNull();
    expect(existsSync(localPath(media.url))).toBe(false);
  });

  it("não aceita referência a imagem inexistente", async () => {
    await expectStatus(
      getDb().transaction((tx) => syncMediaUsages(tx, "section", "hero", [{ mediaId: "00000000-0000-4000-8000-000000000000", field: "x", label: "x" }])),
      422,
    );
  });

  it("lista com busca, filtros e paginação por cursor", async () => {
    for (let i = 0; i < 5; i++) await uploadMedia(actor, { buffer: await jpeg(50 + i, 50, "#777777"), filename: `lote-${i}.jpg`, alt: i === 0 ? "" : `Foto ${i}` }, ctx);
    const page1 = await listMedia({ limit: 2 });
    const page2 = await listMedia({ limit: 2, cursor: page1.nextCursor });
    const page3 = await listMedia({ limit: 2, cursor: page2.nextCursor });
    const ids = [...page1.items, ...page2.items, ...page3.items].map((m) => m.id);
    expect(new Set(ids).size).toBe(5);
    expect(page3.nextCursor).toBeNull();

    expect((await listMedia({ q: "lote-3" })).items).toHaveLength(1);
    expect((await listMedia({ q: "%" })).items).toHaveLength(0);
    expect((await listMedia({ filter: "no-alt" })).items).toHaveLength(1);
    expect((await listMedia({ filter: "unused" })).items).toHaveLength(5);
  });
});
