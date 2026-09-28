import { config } from "dotenv";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Os testes usam um banco separado (DATABASE_URL_TEST) para nunca tocar nos dados de desenvolvimento.
config({ path: [".env.test.local", ".env.local"], quiet: true });
if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

// Uploads dos testes vão para um diretório temporário, nunca para public/uploads nem para o Vercel Blob.
delete process.env.BLOB_READ_WRITE_TOKEN;
process.env.MEDIA_LOCAL_DIR ??= mkdtempSync(join(tmpdir(), "rv-media-"));
