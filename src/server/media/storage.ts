import "server-only";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { del, put } from "@vercel/blob";
import { env, isProduction } from "@/server/env";
import { HttpError } from "@/server/http/errors";

/**
 * Armazenamento de arquivos de mídia. O Postgres guarda só os metadados (URL, dimensões, alt);
 * os bytes ficam em object storage.
 *
 * - Produção: Vercel Blob (BLOB_READ_WRITE_TOKEN). URLs públicas e imutáveis, servidas por CDN.
 * - Desenvolvimento e testes: disco local em public/uploads (fora do Git), servido pelo próprio Next.
 */
export interface MediaStorage {
  readonly name: "vercel-blob" | "local";
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;
  delete(key: string, url: string): Promise<void>;
}

/** Arquivos nunca são sobrescritos: cada envio ganha uma chave nova, então o cache pode ser longo. */
const ONE_YEAR = 60 * 60 * 24 * 365;

class VercelBlobStorage implements MediaStorage {
  readonly name = "vercel-blob" as const;
  constructor(private token: string) {}

  async put(key: string, body: Buffer, contentType: string) {
    const result = await put(key, body, {
      access: "public",
      contentType,
      token: this.token,
      addRandomSuffix: false,
      cacheControlMaxAge: ONE_YEAR,
    });
    return { url: result.url };
  }

  async delete(_key: string, url: string) {
    await del(url, { token: this.token });
  }
}

/** MEDIA_LOCAL_DIR existe só para os testes gravarem em um diretório temporário. */
// Só desenvolvimento e testes: o bundler não deve rastrear o projeto inteiro por causa deste caminho.
const LOCAL_ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_LOCAL_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads"));

class LocalStorage implements MediaStorage {
  readonly name = "local" as const;

  private resolve(key: string) {
    const target = path.resolve(LOCAL_ROOT, key);
    // A chave é gerada pelo servidor, mas o caminho é conferido mesmo assim (sem path traversal).
    if (!target.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Chave de armazenamento inválida.");
    return target;
  }

  async put(key: string, body: Buffer) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body, { flag: "wx" });
    return { url: `/uploads/${key}` };
  }

  async delete(key: string) {
    await unlink(this.resolve(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

let instance: MediaStorage | null = null;

export function getStorage(): MediaStorage {
  if (instance) return instance;
  if (env.BLOB_READ_WRITE_TOKEN) instance = new VercelBlobStorage(env.BLOB_READ_WRITE_TOKEN);
  else if (!isProduction) instance = new LocalStorage();
  else throw new HttpError(503, "storage_not_configured", "O armazenamento de imagens não está configurado.");
  return instance;
}

export function isStorageConfigured() {
  return Boolean(env.BLOB_READ_WRITE_TOKEN) || !isProduction;
}
