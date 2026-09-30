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

/** Etapas do atendimento de um diagnóstico, na ordem do funil. */
export const DIAGNOSTIC_STATUSES = [
  { key: "novo", label: "Novo", tone: "sky" },
  { key: "em_contato", label: "Em contato", tone: "amber" },
  { key: "call_agendada", label: "Call agendada", tone: "violet" },
  { key: "proposta", label: "Proposta enviada", tone: "indigo" },
  { key: "fechado", label: "Fechado", tone: "green" },
  { key: "descartado", label: "Descartado", tone: "neutral" },
] as const;

export type DiagnosticStatus = (typeof DIAGNOSTIC_STATUSES)[number]["key"];
export const STATUS_KEYS = DIAGNOSTIC_STATUSES.map((s) => s.key) as [DiagnosticStatus, ...DiagnosticStatus[]];
export const statusLabel = (key: string) => DIAGNOSTIC_STATUSES.find((s) => s.key === key)?.label ?? key;

/** Atualização feita pela equipe no CMS: etapa e/ou anotações. */
export const diagnosticUpdateSchema = z
  .object({ status: z.enum(STATUS_KEYS).optional(), notes: z.string().max(5000).optional() })
  .refine((v) => v.status !== undefined || v.notes !== undefined, "vazio");

/** Serviço da Rocket que resolve cada problema marcado no quiz (página em /servicos). */
const PROBLEM_SERVICES: Record<string, { label: string; href: string } | undefined> = {
  [PROBLEMS[0]]: { label: "Criação de sites", href: "/servicos/criacao-de-sites" },
  [PROBLEMS[1]]: { label: "Lojas virtuais", href: "/servicos/lojas-virtuais" },
  [PROBLEMS[2]]: { label: "Sistemas sob medida", href: "/servicos/sistemas-sob-medida" },
  [PROBLEMS[3]]: { label: "Aplicativos", href: "/servicos/aplicativos" },
  [PROBLEMS[4]]: { label: "Anúncios no Google e nas redes", href: "/servicos/anuncios" },
};

/**
 * Leitura inicial mostrada no fim do quiz, montada só com as respostas: o que já dá pra ver do
 * cenário e por onde começar. É um ponto de partida para a call, não o diagnóstico completo.
 */
export function readingFor(d: { business: string; presence: string; problems: readonly string[]; timing: string }) {
  const b = d.business;
  const presence: Record<string, string> = {
    [PRESENCE[0]]: `A ${b} já tem site no ar. O ponto agora é fazer ele trabalhar: trazer contato e venda, não só existir.`,
    [PRESENCE[1]]: `O site da ${b} saiu do ar: hoje, quem procura pelo que você faz no Google não te encontra.`,
    [PRESENCE[2]]: `A ${b} depende só das redes sociais: se o algoritmo muda ou a conta cai, os clientes somem junto.`,
  };
  const timing: Record<string, string> = {
    [TIMING[0]]: "Como é pra ontem, a call começa pelo que dá resultado mais rápido, e o resto entra em etapas.",
    [TIMING[1]]: "Com algumas semanas pela frente, dá pra planejar direito e lançar em etapas, sem correria.",
    [TIMING[2]]: "Sem pressa: a call serve pra você entender caminhos, prazos e investimento antes de decidir.",
  };
  const services = d.problems.flatMap((p) => PROBLEM_SERVICES[p] ?? []);
  const count = d.problems.length;
  const points = [
    presence[d.presence],
    count > 1 ? `Você marcou ${count} frentes. Elas se conectam, então vale decidir a ordem certa em vez de fazer tudo de uma vez.` : `Você marcou uma frente clara, o que deixa o primeiro passo bem definido.`,
    timing[d.timing],
  ].filter(Boolean);
  return { points, services };
}
