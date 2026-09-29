import "server-only";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, ilike, inArray, lt, notExists, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema, type Tx } from "@/server/db";
import { audit } from "@/server/audit";
import { CACHE_TAGS, invalidate } from "@/server/cache";
import { log } from "@/server/log";
import { conflict, HttpError, notFound } from "@/server/http/errors";
import { processImage, sanitizeFilename } from "./process";
import { getStorage } from "./storage";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };

export type MediaItem = {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  alt: string;
  filename: string;
  blurDataUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
};

export type MediaUsage = { resourceType: string; resourceId: string; field: string; label: string };

const columns = {
  id: schema.media.id,
  url: schema.media.url,
  mimeType: schema.media.mimeType,
  sizeBytes: schema.media.sizeBytes,
  width: schema.media.width,
  height: schema.media.height,
  alt: schema.media.alt,
  filename: schema.media.filename,
  blurDataUrl: schema.media.blurDataUrl,
  createdAt: schema.media.createdAt,
  updatedAt: schema.media.updatedAt,
};

const usageCount = sql<number>`(select count(*)::int from ${schema.mediaUsages} u where u.media_id = ${schema.media.id})`;

function storageKeyFor(ext: string) {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `media/${now.getUTCFullYear()}/${month}/${randomUUID()}.${ext}`;
}

/* -------------------------------------------------------------------------- */
/* Leitura                                                                      */
/* -------------------------------------------------------------------------- */

export const MEDIA_PAGE_SIZE = 40;

/**
 * Lista paginada por cursor (data de criação + id), da mais recente para a mais antiga.
 * `q` busca no nome do arquivo e no texto alternativo.
 */
export async function listMedia(input: { q?: string; filter?: "all" | "unused" | "no-alt"; cursor?: string | null; limit?: number; uploadedBy?: string }) {
  const limit = Math.min(input.limit ?? MEDIA_PAGE_SIZE, 100);
  const where: SQL[] = [];
  // Biblioteca pessoal (Colunista): só o que a própria pessoa enviou.
  if (input.uploadedBy) where.push(eq(schema.media.uploadedBy, input.uploadedBy));
  const q = input.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(schema.media.filename, pattern), ilike(schema.media.alt, pattern))!);
  }
  if (input.filter === "unused") {
    where.push(notExists(getDb().select({ one: sql`1` }).from(schema.mediaUsages).where(eq(schema.mediaUsages.mediaId, schema.media.id))));
  }
  if (input.filter === "no-alt") where.push(eq(schema.media.alt, ""));

  const cursor = decodeCursor(input.cursor);
  if (cursor) {
    where.push(
      or(lt(schema.media.createdAt, cursor.createdAt), and(eq(schema.media.createdAt, cursor.createdAt), lt(schema.media.id, cursor.id)))!,
    );
  }

  const rows = await getDb()
    .select({ ...columns, usageCount })
    .from(schema.media)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.media.createdAt), desc(schema.media.id))
    .limit(limit + 1);

  const items: MediaItem[] = rows.slice(0, limit);
  const last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null };
}

export async function countMedia() {
  const [row] = await getDb().select({ total: count() }).from(schema.media);
  return row?.total ?? 0;
}

function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(cursor?: string | null) {
  if (!cursor || cursor.length > 200) return null;
  const [iso, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  const createdAt = new Date(iso ?? "");
  if (Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/.test(id ?? "")) return null;
  return { createdAt, id };
}

export async function getMedia(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await getDb()
    .select({ ...columns, usageCount, uploadedByName: schema.users.name })
    .from(schema.media)
    .leftJoin(schema.users, eq(schema.users.id, schema.media.uploadedBy))
    .where(eq(schema.media.id, id));
  if (!row) return null;
  const usages = await getDb()
    .select({ resourceType: schema.mediaUsages.resourceType, resourceId: schema.mediaUsages.resourceId, field: schema.mediaUsages.field, label: schema.mediaUsages.label })
    .from(schema.mediaUsages)
    .where(eq(schema.mediaUsages.mediaId, id))
    .orderBy(schema.mediaUsages.label);
  return { ...row, usages: usages as MediaUsage[] };
}

/** Dados de exibição de várias mídias de uma vez (usado para renderizar conteúdo). */
export async function getMediaByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(isUuid))];
  if (unique.length === 0) return new Map<string, MediaItem>();
  const rows = await getDb()
    .select({ ...columns, usageCount: sql<number>`0` })
    .from(schema.media)
    .where(inArray(schema.media.id, unique));
  return new Map(rows.map((r) => [r.id, r]));
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/* -------------------------------------------------------------------------- */
/* Envio                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Valida, normaliza, grava no storage e registra a mídia.
 * Se a mesma imagem (mesmo SHA-256 depois de normalizada) já existe, devolve a existente em vez de duplicar.
 */
export async function uploadMedia(actor: Actor, file: { buffer: Buffer; filename: string; alt?: string }, ctx: Ctx) {
  const image = await processImage(file.buffer);
  const db = getDb();

  const [existing] = await db.select(columns).from(schema.media).where(eq(schema.media.sha256, image.sha256)).limit(1);
  if (existing) return { media: existing, duplicate: true };

  const storage = getStorage();
  const key = storageKeyFor(image.ext);
  const { url } = await storage.put(key, image.buffer, image.mime);

  try {
    const media = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.media)
        .values({
          storageKey: key,
          url,
          mimeType: image.mime,
          sizeBytes: image.sizeBytes,
          width: image.width,
          height: image.height,
          alt: file.alt?.trim() ?? "",
          filename: sanitizeFilename(file.filename),
          sha256: image.sha256,
          blurDataUrl: image.blurDataUrl,
          uploadedBy: actor.id,
        })
        .returning(columns);
      await audit(
        { actor, action: "media.uploaded", resourceType: "media", resourceId: row.id, summary: `Enviou a imagem ${row.filename}`, ...ctx },
        tx,
      );
      return row;
    });
    return { media, duplicate: false };
  } catch (error) {
    // Sem registro no banco, o arquivo não pode ficar órfão no storage.
    await storage.delete(key, url).catch((e) => log.error("media.orphan_cleanup_failed", { key, error: e }));
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Edição                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Atualiza texto alternativo e nome. `expectedUpdatedAt` implementa concorrência otimista:
 * se outra pessoa salvou antes, responde 409 em vez de sobrescrever.
 */
export async function updateMedia(actor: Actor, id: string, input: { alt: string; filename: string; expectedUpdatedAt: string }, ctx: Ctx) {
  if (!isUuid(id)) throw notFound("Imagem não encontrada.");
  const result = await getDb().transaction(async (tx) => {
    const current = await lockMedia(tx, id);
    assertNotStale(current.updatedAt, input.expectedUpdatedAt);

    const next = { alt: input.alt.trim(), filename: sanitizeFilename(input.filename) };
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    if (current.alt !== next.alt) changes.alt = { before: current.alt, after: next.alt };
    if (current.filename !== next.filename) changes.filename = { before: current.filename, after: next.filename };
    if (Object.keys(changes).length === 0) return { media: current, changed: false };

    const [row] = await tx.update(schema.media).set({ ...next, updatedAt: new Date() }).where(eq(schema.media.id, id)).returning(columns);
    await audit(
      { actor, action: "media.updated", resourceType: "media", resourceId: id, summary: `Editou os dados da imagem ${row.filename}`, changes, ...ctx },
      tx,
    );
    return { media: row, changed: true };
  });
  // O texto alternativo aparece no site quando o conteúdo não define um próprio.
  if (result.changed) invalidate(CACHE_TAGS.media);
  return result.media;
}

/**
 * Troca o arquivo de uma mídia mantendo o mesmo id: todos os lugares que a usam
 * (inclusive o conteúdo já publicado) passam a exibir o arquivo novo.
 */
export async function replaceMedia(actor: Actor, id: string, file: { buffer: Buffer; filename: string }, expectedUpdatedAt: string, ctx: Ctx) {
  if (!isUuid(id)) throw notFound("Imagem não encontrada.");
  const image = await processImage(file.buffer);
  const storage = getStorage();
  const key = storageKeyFor(image.ext);
  const { url } = await storage.put(key, image.buffer, image.mime);

  let previous: { storageKey: string; url: string } | null = null;
  try {
    const media = await getDb().transaction(async (tx) => {
      const current = await lockMedia(tx, id);
      assertNotStale(current.updatedAt, expectedUpdatedAt);
      previous = { storageKey: current.storageKey, url: current.url };

      const [row] = await tx
        .update(schema.media)
        .set({
          storageKey: key,
          url,
          mimeType: image.mime,
          sizeBytes: image.sizeBytes,
          width: image.width,
          height: image.height,
          sha256: image.sha256,
          blurDataUrl: image.blurDataUrl,
          filename: sanitizeFilename(file.filename),
          updatedAt: new Date(),
        })
        .where(eq(schema.media.id, id))
        .returning(columns);
      await audit(
        {
          actor,
          action: "media.replaced",
          resourceType: "media",
          resourceId: id,
          summary: `Substituiu o arquivo da imagem ${current.filename}`,
          changes: {
            filename: { before: current.filename, after: row.filename },
            dimensions: { before: `${current.width}x${current.height}`, after: `${row.width}x${row.height}` },
          },
          ...ctx,
        },
        tx,
      );
      return row;
    });

    invalidate(CACHE_TAGS.media);
    const old = previous as { storageKey: string; url: string } | null;
    if (old) {
      await storage.delete(old.storageKey, old.url).catch((e) => log.error("media.old_file_cleanup_failed", { key: old.storageKey, error: e }));
    }
    return media;
  } catch (error) {
    await storage.delete(key, url).catch((e) => log.error("media.orphan_cleanup_failed", { key, error: e }));
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Remoção                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Remove a mídia se ela não estiver em uso em nenhum lugar (rascunho ou publicado).
 * Em uso: 409 com a lista de onde aparece, para a pessoa decidir o que trocar antes.
 */
export async function deleteMedia(actor: Actor, id: string, ctx: Ctx) {
  if (!isUuid(id)) throw notFound("Imagem não encontrada.");
  const removed = await getDb().transaction(async (tx) => {
    const current = await lockMedia(tx, id);
    const usages = await tx
      .select({ resourceType: schema.mediaUsages.resourceType, resourceId: schema.mediaUsages.resourceId, field: schema.mediaUsages.field, label: schema.mediaUsages.label })
      .from(schema.mediaUsages)
      .where(eq(schema.mediaUsages.mediaId, id));
    if (usages.length > 0) {
      throw new HttpError(409, "media_in_use", "Esta imagem está em uso. Troque-a nos lugares abaixo antes de remover.", { details: { usages } });
    }
    try {
      await tx.delete(schema.media).where(eq(schema.media.id, id));
    } catch (error) {
      // Rede de segurança: as chaves estrangeiras (capa, logo, galeria) impedem a remoção de algo referenciado.
      if ((error as { code?: string }).code === "23503") throw conflict("Esta imagem está em uso e não pode ser removida.", "media_in_use");
      throw error;
    }
    await audit(
      { actor, action: "media.deleted", resourceType: "media", resourceId: id, summary: `Removeu a imagem ${current.filename}`, ...ctx },
      tx,
    );
    return current;
  });

  await getStorage()
    .delete(removed.storageKey, removed.url)
    .catch((e) => log.error("media.file_delete_failed", { key: removed.storageKey, error: e }));
}

async function lockMedia(tx: Tx, id: string) {
  const [row] = await tx.select().from(schema.media).where(eq(schema.media.id, id)).for("update");
  if (!row) throw notFound("Imagem não encontrada.");
  return row;
}

function assertNotStale(updatedAt: Date, expected: string) {
  if (updatedAt.toISOString() !== new Date(expected).toISOString()) {
    throw conflict("Esta imagem foi alterada por outra pessoa. Recarregue para ver a versão atual.", "stale");
  }
}

/* -------------------------------------------------------------------------- */
/* Uso                                                                          */
/* -------------------------------------------------------------------------- */

export type MediaRef = { mediaId: string; field: string; label: string };

/**
 * Reescreve os usos de mídia de um recurso (uma seção ou um projeto), dentro da mesma transação
 * da gravação do conteúdo. A FK para `media` faz a gravação falhar se uma imagem referenciada
 * tiver sido removida nesse meio tempo.
 */
export async function syncMediaUsages(tx: Tx, resourceType: string, resourceId: string, refs: MediaRef[]) {
  await tx.delete(schema.mediaUsages).where(and(eq(schema.mediaUsages.resourceType, resourceType), eq(schema.mediaUsages.resourceId, resourceId)));
  const unique = new Map<string, MediaRef>();
  for (const ref of refs) if (isUuid(ref.mediaId)) unique.set(`${ref.mediaId}|${ref.field}`, ref);
  if (unique.size === 0) return;

  const ids = [...new Set([...unique.values()].map((r) => r.mediaId))];
  const found = await tx.select({ id: schema.media.id }).from(schema.media).where(inArray(schema.media.id, ids)).for("share");
  const missing = ids.filter((id) => !found.some((f) => f.id === id));
  if (missing.length > 0) throw new HttpError(422, "media_missing", "Uma das imagens escolhidas foi removida da biblioteca. Escolha outra.");

  await tx.insert(schema.mediaUsages).values([...unique.values()].map((r) => ({ mediaId: r.mediaId, resourceType, resourceId, field: r.field, label: r.label })));
}
