import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
import { defineConfig } from "drizzle-kit";

/**
 * Migrations versionadas em ./drizzle (SQL puro, revisável no Git).
 * Gerar:  npm run db:generate
 * Aplicar: npm run db:migrate   (usa DATABASE_URL_UNPOOLED: migrations não devem passar pelo PgBouncer)
 */
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("Defina DATABASE_URL_UNPOOLED (ou DATABASE_URL) para rodar migrations.");

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
