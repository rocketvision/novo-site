import "server-only";
import { sql } from "drizzle-orm";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { getDb } from "@/server/db";
import { log } from "@/server/log";
import { tooManyRequests } from "@/server/http/errors";

/**
 * Rate limiting por janela fixa, armazenado no Postgres.
 *
 * Por que no banco: a aplicação roda em funções serverless (várias instâncias); um Map em memória
 * não seria compartilhado. O upsert abaixo é atômico (uma única instrução com ON CONFLICT),
 * então requisições concorrentes nunca "perdem" contagem.
 */

export type Policy = {
  /** Nome do limite, usado na chave. */
  name: string;
  limit: number;
  windowSeconds: number;
  /**
   * Em falha do banco: "closed" bloqueia (usado em login e senha), "open" libera e registra.
   * Autenticação nunca pode ficar sem proteção contra força bruta por causa de uma falha.
   */
  onError: "open" | "closed";
};

export const POLICIES = {
  loginByIp: { name: "login-ip", limit: 20, windowSeconds: 15 * 60, onError: "closed" },
  loginByEmail: { name: "login-email", limit: 5, windowSeconds: 15 * 60, onError: "closed" },
  resetRequestByIp: { name: "reset-ip", limit: 5, windowSeconds: 60 * 60, onError: "closed" },
  resetRequestByEmail: { name: "reset-email", limit: 3, windowSeconds: 60 * 60, onError: "closed" },
  tokenSubmitByIp: { name: "token-ip", limit: 10, windowSeconds: 60 * 60, onError: "closed" },
  mutationByUser: { name: "mutation-user", limit: 120, windowSeconds: 60, onError: "open" },
  uploadByUser: { name: "upload-user", limit: 40, windowSeconds: 10 * 60, onError: "open" },
  apiReadByUser: { name: "read-user", limit: 600, windowSeconds: 60, onError: "open" },
  contactByIp: { name: "contact-ip", limit: 5, windowSeconds: 10 * 60, onError: "open" },
  /** Diagnóstico (quiz do site): poucos envios por IP e um teto geral por hora, contra spam e inundação do banco. */
  diagnosticByIp: { name: "diagnostic-ip", limit: 5, windowSeconds: 10 * 60, onError: "open" },
  diagnosticGlobal: { name: "diagnostic-all", limit: 200, windowSeconds: 60 * 60, onError: "open" },
  /**
   * Agenda pública. Consulta de horários: por IP e um teto geral (cada consulta vai ao Google Calendar;
   * o teto protege a cota da conta). Agendamento: por IP, por diagnóstico e um teto diário geral
   * (cada call cria um evento e pode mandar convite por e-mail: impede usar a agenda para disparar
   * convites em massa). Fecham em falha do banco: sem contagem, nada chega ao Google.
   */
  slotsByIp: { name: "slots-ip", limit: 60, windowSeconds: 10 * 60, onError: "open" },
  slotsGlobal: { name: "slots-all", limit: 1500, windowSeconds: 10 * 60, onError: "open" },
  bookingByIp: { name: "booking-ip", limit: 10, windowSeconds: 10 * 60, onError: "closed" },
  bookingByDiagnostic: { name: "booking-diagnostic", limit: 6, windowSeconds: 60 * 60, onError: "closed" },
  bookingGlobal: { name: "booking-all", limit: 40, windowSeconds: 24 * 60 * 60, onError: "closed" },
  preferenceByIp: { name: "preference-ip", limit: 20, windowSeconds: 10 * 60, onError: "open" },
  previewByUser: { name: "preview-user", limit: 60, windowSeconds: 60, onError: "open" },
  /** Busca pública do Blog: consulta de texto no banco, limitada por IP. */
  blogSearchByIp: { name: "blog-search-ip", limit: 30, windowSeconds: 60, onError: "open" },
  /** Rocket Alliance: candidatura pública (por IP e teto geral, contra spam e inundação do banco). */
  applicationByIp: { name: "alliance-apply-ip", limit: 3, windowSeconds: 60 * 60, onError: "open" },
  applicationGlobal: { name: "alliance-apply-all", limit: 100, windowSeconds: 60 * 60, onError: "open" },
  /**
   * Alliance Hub: autenticação com limites próprios (independentes dos do CMS) e fechados em falha,
   * como os do login do Studio. O segundo fator tem limite por desafio: 5 códigos errados e o login
   * recomeça do zero.
   */
  hubLoginByIp: { name: "hub-login-ip", limit: 20, windowSeconds: 15 * 60, onError: "closed" },
  hubLoginByEmail: { name: "hub-login-email", limit: 5, windowSeconds: 15 * 60, onError: "closed" },
  hubTwoFactor: { name: "hub-2fa", limit: 5, windowSeconds: 15 * 60, onError: "closed" },
  hubResetByIp: { name: "hub-reset-ip", limit: 5, windowSeconds: 60 * 60, onError: "closed" },
  hubResetByEmail: { name: "hub-reset-email", limit: 3, windowSeconds: 60 * 60, onError: "closed" },
  hubTokenByIp: { name: "hub-token-ip", limit: 10, windowSeconds: 60 * 60, onError: "closed" },
  hubMutationByUser: { name: "hub-mutation-user", limit: 60, windowSeconds: 60, onError: "open" },
  hubReadByUser: { name: "hub-read-user", limit: 600, windowSeconds: 60, onError: "open" },
  /** Indicações e chamados: limite por pessoa, para um acesso comprometido não inundar a equipe. */
  referralByUser: { name: "hub-referral-user", limit: 20, windowSeconds: 60 * 60, onError: "open" },
  ticketByUser: { name: "hub-ticket-user", limit: 15, windowSeconds: 60 * 60, onError: "open" },
  downloadByUser: { name: "hub-download-user", limit: 120, windowSeconds: 10 * 60, onError: "open" },
  /** Rota do cron: protegida por segredo, o limite só evita abuso de quem tente adivinhar. */
  cronByIp: { name: "cron-ip", limit: 30, windowSeconds: 60, onError: "open" },
} satisfies Record<string, Policy>;

/** Identificadores como e-mail entram na chave só como hash: a tabela não guarda dados pessoais. */
export function hashIdentifier(value: string) {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(value.trim().toLowerCase()))).slice(0, 32);
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfter: number };

export async function consume(policy: Policy, identifier: string): Promise<RateLimitResult> {
  const key = `${policy.name}:${identifier}`;
  try {
    const db = getDb();
    const interval = `${policy.windowSeconds} seconds`;
    const result = await db.execute<{ count: number; retry_after: number }>(sql`
      INSERT INTO rate_limits (key, count, window_start, expires_at)
      VALUES (${key}, 1, now(), now() + ${interval}::interval)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.expires_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.expires_at <= now() THEN now() ELSE rate_limits.window_start END,
        expires_at = CASE WHEN rate_limits.expires_at <= now() THEN now() + ${interval}::interval ELSE rate_limits.expires_at END
      RETURNING count, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (expires_at - now()))))::int AS retry_after
    `);
    const row = result.rows[0];

    // Limpeza oportunista de janelas vencidas (evita um job separado).
    if (Math.random() < 0.01) {
      void db.execute(sql`DELETE FROM rate_limits WHERE expires_at < now() - interval '1 hour'`).catch(() => {});
    }

    return { allowed: row.count <= policy.limit, remaining: Math.max(0, policy.limit - row.count), retryAfter: row.retry_after };
  } catch (error) {
    log.error("rate_limit.failed", { policy: policy.name, error });
    if (policy.onError === "closed") return { allowed: false, remaining: 0, retryAfter: 60 };
    return { allowed: true, remaining: policy.limit, retryAfter: 0 };
  }
}

/** Consome e lança 429 se o limite estourou. */
export async function enforce(policy: Policy, identifier: string) {
  const result = await consume(policy, identifier);
  if (!result.allowed) {
    log.warn("rate_limit.blocked", { policy: policy.name });
    throw tooManyRequests(result.retryAfter);
  }
  return result;
}
