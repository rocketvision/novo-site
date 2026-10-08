import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardCheck, Download, Search } from "lucide-react";
import { buttonClass } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/field";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { StatusBadge } from "@/components/cms/diagnostics/status-badge";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { DIAGNOSTIC_STATUSES, STATUS_KEYS, type DiagnosticStatus } from "@/lib/diagnostic";
import { requirePermission } from "@/server/authz/guard";
import { countDiagnosticsByStatus, listDiagnostics } from "@/server/diagnostics/service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Diagnósticos" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/**
 * Diagnósticos: as respostas do quiz do site, como um funil de atendimento. No topo, quantos há em
 * cada etapa (clicar filtra); a busca acha por nome, negócio ou WhatsApp. Cada linha abre o
 * diagnóstico completo, onde a equipe muda a etapa, anota e chama no WhatsApp.
 */
export default async function DiagnosticsPage({ searchParams }: { searchParams: Search }) {
  await requirePermission("diagnostics.view", "/cms/diagnosticos");
  const sp = await searchParams;
  const status = STATUS_KEYS.includes(one(sp.etapa) as DiagnosticStatus) ? (one(sp.etapa) as DiagnosticStatus) : undefined;
  const q = one(sp.q)?.slice(0, 100) ?? "";
  const beforeRaw = one(sp.antes);
  const before = beforeRaw && !Number.isNaN(Date.parse(beforeRaw)) ? new Date(beforeRaw) : undefined;

  const [{ items, nextBefore }, counts] = await Promise.all([listDiagnostics({ status, q, before }), countDiagnosticsByStatus()]);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  const href = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    return `/cms/diagnosticos${u.size ? `?${u}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Diagnósticos"
        description="Quem respondeu o diagnóstico no site. Acompanhe cada um pelas etapas do atendimento, anote e chame no WhatsApp."
        actions={
          total > 0 && (
            <a href="/api/cms/diagnostics/export" className={buttonClass("secondary", "md")} download>
              <Download className="size-4" aria-hidden="true" />
              Exportar planilha
            </a>
          )
        }
      />

      {/* Funil: cada etapa com o total; clicar filtra a lista. */}
      <nav aria-label="Etapas" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <FunnelLink href={href({ q })} label="Todos" value={total} active={!status} />
        {DIAGNOSTIC_STATUSES.map((s) => (
          <FunnelLink key={s.key} href={href({ etapa: s.key, q })} label={s.label} value={counts[s.key] ?? 0} active={status === s.key} highlight={s.key === "novo" && (counts.novo ?? 0) > 0} />
        ))}
      </nav>

      <form action="/cms/diagnosticos" className="mb-4 flex gap-2" role="search">
        {status && <input type="hidden" name="etapa" value={status} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <Input name="q" defaultValue={q} placeholder="Buscar por nome, negócio ou WhatsApp" aria-label="Buscar diagnósticos" className="pl-9" />
        </div>
        <button type="submit" className={buttonClass("secondary", "md")}>
          Buscar
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="size-8" />}
          title={total === 0 ? "Nenhum diagnóstico ainda. Eles aparecem aqui assim que alguém responde o quiz no site." : "Nenhum diagnóstico encontrado com esses filtros."}
          action={
            (status || q) && (
              <Link href="/cms/diagnosticos" className={buttonClass("secondary", "sm")}>
                Limpar filtros
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {items.map((d) => (
              <li key={d.id}>
                <Link href={`/cms/diagnosticos/${d.id}`} className="group grid gap-2 px-4 py-3.5 hover:bg-zinc-50 sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-4">
                  <p className="text-xs text-zinc-500" title={formatDateTime(d.createdAt)}>
                    {relativeTime(d.createdAt)}
                  </p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {d.business} <span className="font-normal text-zinc-500">· {d.name}</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {d.problems.join(", ")} · <span className="text-zinc-700">{d.timing}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.contactPreference === "agendou" && <span className="text-xs text-sky-700">call marcada</span>}
                    {d.notes && <span className="text-xs text-zinc-400">com anotações</span>}
                    <StatusBadge status={d.status} />
                    <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {nextBefore && (
            <div className="border-t border-zinc-100 px-4 py-3 text-right">
              <Link href={href({ etapa: status, q, antes: nextBefore.toISOString() })} className={buttonClass("ghost", "sm")}>
                Mais antigos
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FunnelLink({ href, label, value, active, highlight }: { href: string; label: string; value: number; active: boolean; highlight?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg border px-3 py-2.5 transition-colors",
        active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300",
      )}
    >
      <span className={cn("block text-xs", active ? "text-white/70" : "text-zinc-500")}>{label}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold tabular-nums">
        {value}
        {highlight && !active && <span className="size-1.5 rounded-full bg-sky-500" aria-label="há diagnósticos novos" />}
      </span>
    </Link>
  );
}
