import "server-only";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { get, put, del } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { env, isProduction } from "@/server/env";
import { badRequest, HttpError, notFound, payloadTooLarge, unsupportedMediaType } from "@/server/http/errors";
import { log } from "@/server/log";

/**
 * Arquivos privados do Rocket Alliance (materiais, apresentações, contratos em PDF).
 *
 * Diferente da biblioteca de mídia (imagens públicas do site), estes arquivos nunca têm URL pública:
 * - produção: Vercel Blob com acesso "private" (a leitura exige o token do servidor);
 * - desenvolvimento e testes: disco local fora de /public.
 * O download passa sempre por uma rota que confere a sessão e a permissão de quem pede.
 * O tipo é detectado pelos bytes; executáveis e HTML nunca entram.
 */

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const ACCEPTED: Record<string, string> = {
  "application/pdf": "pdf",
  "application/zip": "zip",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  // Office moderno é um zip; file-type identifica cada um pelo conteúdo.
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "video/mp4": "mp4",
};

const LOCAL_ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.ALLIANCE_FILES_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "alliance-files"));

function localPath(key: string) {
  const target = path.resolve(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Chave de armazenamento inválida.");
  return target;
}

const blobEnabled = () => Boolean(env.BLOB_READ_WRITE_TOKEN);

export function isFileStorageConfigured() {
  return blobEnabled() || !isProduction;
}

export async function uploadAllianceFile(actor: { id: string; email: string }, file: { buffer: Buffer; filename: string }, ctx: { ip: string | null; userAgent: string | null }) {
  if (file.buffer.length === 0) throw badRequest("O arquivo está vazio.");
  if (file.buffer.length > MAX_FILE_BYTES) throw payloadTooLarge(`O arquivo pode ter no máximo ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  const detected = await fileTypeFromBuffer(file.buffer);
  const ext = detected ? ACCEPTED[detected.mime] : undefined;
  if (!detected || !ext) throw unsupportedMediaType("Formato não aceito. Envie PDF, PPTX, DOCX, XLSX, ZIP, imagem ou MP4.");
  if (!isFileStorageConfigured()) throw new HttpError(503, "storage_not_configured", "O armazenamento de arquivos não está configurado.");

  const key = `alliance/${new Date().getUTCFullYear()}/${randomUUID()}.${ext}`;
  const filename = file.filename.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || `arquivo.${ext}`;
  if (blobEnabled()) {
    await put(key, file.buffer, { access: "private", contentType: detected.mime, token: env.BLOB_READ_WRITE_TOKEN, addRandomSuffix: false });
  } else {
    const target = localPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.buffer, { flag: "wx" });
  }
  try {
    const [row] = await getDb()
      .insert(schema.allianceFiles)
      .values({ storageKey: key, filename, mimeType: detected.mime, sizeBytes: file.buffer.length, sha256: createHash("sha256").update(file.buffer).digest("hex"), uploadedBy: actor.id })
      .returning();
    await audit({ actor, action: "alliance.file.uploaded", resourceType: "alliance_file", resourceId: row.id, summary: `Enviou o arquivo ${filename}`, ...ctx });
    return row;
  } catch (error) {
    await removeStored(key).catch((e) => log.error("alliance.file_orphan", { key, error: e }));
    throw error;
  }
}

async function removeStored(key: string) {
  if (blobEnabled()) await del(key, { token: env.BLOB_READ_WRITE_TOKEN });
  else await unlink(localPath(key)).catch((e: NodeJS.ErrnoException) => e.code === "ENOENT" || Promise.reject(e));
}

/** Resposta de download (a rota que chama já conferiu quem pode baixar). */
export async function fileResponse(fileId: string) {
  const [file] = await getDb().select().from(schema.allianceFiles).where(eq(schema.allianceFiles.id, fileId));
  if (!file) throw notFound("Arquivo não encontrado.");
  const headers = {
    "Content-Type": file.mimeType,
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (blobEnabled()) {
    const blob = await get(file.storageKey, { access: "private", token: env.BLOB_READ_WRITE_TOKEN });
    if (!blob || blob.statusCode !== 200 || !blob.stream) throw notFound("Arquivo não encontrado.");
    return new Response(blob.stream, { headers });
  }
  const buffer = await readFile(localPath(file.storageKey)).catch(() => null);
  if (!buffer) throw notFound("Arquivo não encontrado.");
  return new Response(new Uint8Array(buffer), { headers: { ...headers, "Content-Length": String(buffer.length) } });
}

export async function readAllianceUpload(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data")) throw unsupportedMediaType("Envie o arquivo como multipart/form-data.");
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_FILE_BYTES + 64 * 1024) throw payloadTooLarge(`O arquivo pode ter no máximo ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw badRequest("Não foi possível ler o envio.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Nenhum arquivo enviado.");
  if (file.size > MAX_FILE_BYTES) throw payloadTooLarge(`O arquivo pode ter no máximo ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  return { buffer: Buffer.from(await file.arrayBuffer()), filename: file.name };
}
