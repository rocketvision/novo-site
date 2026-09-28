import "server-only";
import { z } from "zod";

/**
 * Variáveis de ambiente do servidor, validadas uma única vez.
 * Nada aqui é exposto ao navegador (sem prefixo NEXT_PUBLIC_).
 */
/** Variável definida mas vazia (comum em painéis de hospedagem) conta como não configurada. */
const optional = <T extends z.ZodType>(type: T) => z.preprocess((v) => (v === "" ? undefined : v), type.optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Postgres (Neon com pooling em produção). Sem ela, o site público usa o conteúdo embutido no código. */
  DATABASE_URL: optional(z.string().url()),
  /** URL pública do site, usada em links de convite e redefinição de senha. */
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  /** Endereço próprio do CMS (ex.: https://cms.exemplo.com). Sem ela, o CMS fica em /cms no mesmo endereço do site. */
  CMS_URL: optional(z.string().url()),
  /** Vercel Blob: armazenamento de imagens enviadas pelo CMS. */
  BLOB_READ_WRITE_TOKEN: optional(z.string().min(1)),
  /** Resend: envio de e-mails transacionais (convites e redefinição de senha). Opcional. */
  RESEND_API_KEY: optional(z.string().min(1)),
  MAIL_FROM: optional(z.string().min(3)),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Mensagem com o nome da variável, nunca com o valor.
  const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Variáveis de ambiente inválidas: ${fields}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
/** Origem do CMS: links de convite e de redefinição de senha apontam para cá. */
export const cmsOrigin = new URL(env.CMS_URL ?? env.NEXT_PUBLIC_SITE_URL).origin;
