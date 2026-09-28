import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env, isProduction } from "@/server/env";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL não configurada.");
  }
}

/**
 * Conexão com o Postgres, criada sob demanda.
 * Em produção, DATABASE_URL aponta para o endpoint com pooling do Neon (PgBouncer),
 * então cada instância serverless mantém poucas conexões.
 */
const globalForDb = globalThis as unknown as { rocketDb?: Db; rocketPool?: Pool };

export function isDatabaseConfigured() {
  return Boolean(env.DATABASE_URL);
}

export function getDb(): Db {
  if (globalForDb.rocketDb) return globalForDb.rocketDb;
  if (!env.DATABASE_URL) throw new DatabaseNotConfiguredError();

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: isProduction ? 5 : 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
  const db = drizzle(pool, { schema });
  globalForDb.rocketPool = pool;
  globalForDb.rocketDb = db;
  return db;
}

export { schema };
