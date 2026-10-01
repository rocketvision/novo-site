import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonClass } from "@/components/cms/ui/button";
import { Input, Select } from "@/components/cms/ui/field";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { describeUserAgent } from "@/lib/cms/user-agent";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { requirePermission } from "@/server/authz/guard";
import { queryAudit } from "@/server/audit-log/query";

export const metadata: Metadata = { title: "Auditoria · Rocket Alliance" };

/** Áreas do programa (prefixo da ação registrada). */
const AREAS: Record<string, { label: string; prefixes: string }> = {
  candidaturas: { label: "Candidaturas", prefixes: "alliance.application." },
  parceiros: { label: "Parceiros e páginas", prefixes: "alliance.partner." },
  indicacoes: { label: "Indicações", prefixes: "alliance.referral." },
  regras: { label: "Regras de comissão", prefixes: "alliance.rule." },
  recebimentos: { label: "Recebimentos", prefixes: "alliance.receipt." },
  comissoes: { label: "Lançamentos", prefixes: "alliance.entry." },
  pagamentos: { label: "Pagamentos", prefixes: "alliance.payout." },
  contratos: { label: "Contratos", prefixes: "alliance.contract." },
  hub: { label: "Ações no Alliance Hub", prefixes: "alliance.hub." },
  configuracoes: { label: "Configurações", prefixes: "alliance.settings." },
};

function resourceHref(type: string, id: string | null) {
  if (!id) return null;
  if (type === "partner") return `/cms/alliance/parceiros/${id}`;
  if (type === "partner_application") return `/cms/alliance/candidaturas/${id}`;
  if (type === "referral") return `/cms/alliance/indicacoes/${id}`;
  if (type === "partner_contract") return `/cms/alliance/contratos/${id}`;
  if (type === "support_ticket") return `/cms/alliance/comunicacoes/suporte/${id}`;
  if (type === "opportunity") return `/cms/alliance/recursos/oportunidades/${id}`;
  return null;
}

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "vazio" : typeof v === "object" ? JSON.stringify(v) : String(v));

export default async function AllianceAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission("alliance.settings", "/cms/alliance/configuracoes/auditoria");
  const sp = await searchParams;
  const area = sp.area && AREAS[sp.area] ? sp.area : undefined;
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const before = sp.antes && /^\d+$/.test(sp.antes) ? Number(sp.antes) : undefined;
  const { items, nextBefore } = await queryAudit({ category: area ? undefined : "alliance", actionPrefix: area ? AREAS[area].prefixes : undefined, from: date(sp.de), to: date(sp.ate), before });
  const base = new URLSearchParams(Object.entries({ area, de: date(sp.de), ate: date(sp.ate) }).filter((e): e is [string, string] => Boolean(e[1])));

  return (
    <div className="max-w-5xl">
      <PageHeader title="Auditoria do programa" description="Todas as ações do Rocket Alliance, no CMS e no Hub: quem, o quê, quando e de onde. Valores e comissões nunca são apagados; cancelamentos e estornos aparecem aqui." />
      <form method="get" className="mb-5 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label className="text-[13px] font-medium text-zinc-900">
          Área
          <Select name="area" defaultValue={area ?? ""} className="mt-1.5">
            <option value="">Todas</option>
            {Object.entries(AREAS).map(([k, a]) => (
              <option key={k} value={k}>
                {a.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-[13px] font-medium text-zinc-900">
          De
          <Input type="date" name="de" defaultValue={date(sp.de) ?? ""} className="mt-1.5" />
        </label>
        <label className="text-[13px] font-medium text-zinc-900">
          Até
          <Input type="date" name="ate" defaultValue={date(sp.ate) ?? ""} className="mt-1.5" />
        </label>
        <button type="submit" className={buttonClass("primary", "md")}>
          Filtrar
        </button>
      </form>
      {items.length === 0 ? (
        <EmptyState title="Nenhum registro." />
      ) : (
        <ol className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {items.map((item) => {
            const changes = (item.changes ?? null) as Record<string, { before: unknown; after: unknown }> | null;
            const href = resourceHref(item.resourceType, item.resourceId);
            const who = item.actorName ?? (item.action.startsWith("alliance.hub.") ? `${item.actorEmail} (parceiro)` : (item.actorEmail ?? "Sistema"));
            return (
              <li key={item.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
                    <ChevronRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-zinc-900">{item.summary}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {who} · <time dateTime={item.createdAt.toISOString()}>{relativeTime(item.createdAt)}</time>
                        <span className="hidden sm:inline"> · {item.action}</span>
                      </span>
                    </span>
                    {href && (
                      <Link href={href} className="shrink-0 text-xs text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline">
                        Abrir
                      </Link>
                    )}
                  </summary>
                  <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 pl-11 text-[13px]">
                    {changes && Object.keys(changes).length > 0 && (
                      <dl className="mb-2 space-y-1">
                        {Object.entries(changes).map(([field, c]) => (
                          <div key={field} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                            <dt className="text-zinc-600">{field}</dt>
                            <dd className="break-words">
                              <span className="text-red-800/80 line-through decoration-red-300">{show(c.before)}</span> <span className="text-emerald-900">{show(c.after)}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <p className="text-xs text-zinc-500">
                      {formatDateTime(item.createdAt)}
                      {item.ipAddress && ` · IP ${item.ipAddress}`}
                      {item.userAgent && ` · ${describeUserAgent(item.userAgent)}`}
                    </p>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}
      {nextBefore && (
        <div className="mt-5 flex justify-center">
          <Link href={`?${new URLSearchParams([...base, ["antes", String(nextBefore)]])}`} className={buttonClass("secondary", "sm")}>
            Registros mais antigos
          </Link>
        </div>
      )}
    </div>
  );
}
