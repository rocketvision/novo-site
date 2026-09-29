import "server-only";
import { getDb, schema, type Db, type Tx } from "@/server/db";
import { log } from "@/server/log";

/**
 * Registro de auditoria.
 *
 * Grava quem fez o quê, em qual recurso, quando e de onde, com o antes e o depois
 * apenas dos campos que mudaram. Nunca registra senhas, hashes, tokens ou sessões.
 */

export type AuditActor = { id: string; email: string } | null;

export type AuditEvent = {
  actor: AuditActor;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
  ip?: string | null;
  userAgent?: string | null;
};

const SENSITIVE_KEYS = /pass(word)?|hash|token|secret|session|cookie/i;
const MAX_VALUE_CHARS = 2000;

/** Grava o evento. Dentro de uma transação, fica atômico com a alteração que ele descreve. */
export async function audit(event: AuditEvent, tx?: Tx | Db) {
  const runner = tx ?? getDb();
  try {
    await runner.insert(schema.auditLogs).values({
      actorId: event.actor?.id ?? null,
      actorEmail: event.actor?.email ?? null,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId ?? null,
      summary: event.summary,
      changes: event.changes && Object.keys(event.changes).length > 0 ? event.changes : null,
      ipAddress: event.ip ?? null,
      userAgent: event.userAgent ?? null,
    });
  } catch (error) {
    // Dentro de transação, o erro sobe e desfaz a alteração: nada muda sem ficar registrado.
    if (tx) throw error;
    log.error("audit.write_failed", { action: event.action, error });
  }
}

function truncate(value: unknown): unknown {
  if (value === undefined) return null;
  const serialized = JSON.stringify(value);
  if (serialized && serialized.length > MAX_VALUE_CHARS) return `${serialized.slice(0, MAX_VALUE_CHARS)}… (cortado)`;
  return value;
}

/**
 * JSON com as chaves em ordem alfabética. O jsonb do Postgres não preserva a ordem das chaves,
 * então uma lista de objetos lida do banco não pode ser comparada com JSON.stringify puro.
 */
function stableStringify(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, v: unknown) =>
    typeof v === "object" && v !== null && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

/**
 * Compara dois objetos e devolve só os campos alterados (comparação por caminho, até 3 níveis).
 * Listas são comparadas inteiras. Campos sensíveis são ignorados.
 */
export function diff(before: unknown, after: unknown, prefix = "", depth = 0): Record<string, { before: unknown; after: unknown }> {
  const out: Record<string, { before: unknown; after: unknown }> = {};
  const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);

  if (isObj(before) && isObj(after) && depth < 3) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (SENSITIVE_KEYS.test(key)) continue;
      Object.assign(out, diff(before[key], after[key], prefix ? `${prefix}.${key}` : key, depth + 1));
    }
    return out;
  }

  const a = before instanceof Date ? before.toISOString() : before;
  const b = after instanceof Date ? after.toISOString() : after;
  if (stableStringify(a) !== stableStringify(b)) {
    out[prefix || "valor"] = { before: truncate(a), after: truncate(b) };
  }
  return out;
}
