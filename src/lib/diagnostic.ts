import { z } from "zod";

/**
 * Diagnóstico: o quiz de 7 perguntas que substitui o formulário de contato (no modelo do da UKP
 * Digital, parceira da Rocket, com autorização). Compartilhado entre a tela (DiagnosticQuiz) e a
 * API (/api/diagnostico), para as opções válidas serem sempre as mesmas dos dois lados.
 */

export const SEGMENTS = ["Vende produto: loja ou comércio", "Presta serviço na minha cidade", "Saúde, estética ou bem-estar", "Vende pra outras empresas", "Outra coisa"] as const;

export const PRESENCE = ["Tenho site no ar", "Já tive site, mas saiu do ar", "Só rede social, nunca tive site"] as const;

export const PROBLEMS = [
  "Um site que vende, não só uma vitrine",
  "Uma loja virtual pra vender todo dia",
  "Um sistema pra organizar a operação",
  "Um aplicativo pros meus clientes",
  "Aparecer no Google pra quem já procura",
  "Outro problema",
] as const;

export const TIMING = ["Pra ontem, tô perdendo dinheiro", "Nas próximas semanas", "Ainda tô pesquisando"] as const;

/** Só dígitos; aceita DDD + número (10 ou 11 dígitos), com ou sem o 55 na frente. */
export function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
}

export const isValidPhone = (value: string) => /^[1-9]{2}9?\d{8}$/.test(phoneDigits(value));

/** Máscara (00) 00000-0000 enquanto digita. */
export function maskPhone(value: string) {
  const d = phoneDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const text = (max: number) => z.string().trim().min(1).max(max);

export const diagnosticSchema = z.object({
  name: text(80),
  business: text(120),
  segment: z.enum(SEGMENTS),
  presence: z.enum(PRESENCE),
  problems: z.array(z.enum(PROBLEMS)).min(1).max(PROBLEMS.length),
  timing: z.enum(TIMING),
  whatsapp: z.string().refine(isValidPhone, "whatsapp"),
  /** Página de onde o diagnóstico foi aberto (ex.: /servicos/criacao-de-sites). */
  source: z.string().max(200).optional(),
});

export type Diagnostic = z.infer<typeof diagnosticSchema>;

/** Resumo das respostas em texto, usado no aviso para a equipe e na mensagem de WhatsApp. */
export function summarize(d: { segment: string; presence: string; problems: readonly string[]; timing: string }) {
  return [`• Segmento: ${d.segment}`, `• Hoje na internet: ${d.presence}`, `• Problemas que enxerga: ${d.problems.join(", ")}`, `• Prazo: ${d.timing}`].join("\n");
}
