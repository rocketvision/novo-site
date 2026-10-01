import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Inbox, Search } from "lucide-react";
import { buttonClass } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/field";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { APPLICATION_STATUSES, APPLICATION_STATUS_KEYS, MODALITIES, type ApplicationStatus, type ModalityKey } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { countApplicationsByStatus, listApplications } from "@/server/alliance/applications";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Candidaturas · Rocket Alliance" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function ApplicationsPage({ searchParams }: { searchParams: Search }) {
  await requirePermission("alliance.applications", "/cms/alliance/candidaturas");
  const sp = await searchParams;
  const status = APPLICATION_STATUS_KEYS.includes(one(sp.status) as ApplicationStatus) ? (one(sp.status) as ApplicationStatus) : undefined;
  const q = one(sp.q)?.slice(0, 100) ?? "";
  const beforeRaw = one(sp.antes);
  const before = beforeRaw && !Number.isNaN(Date.parse(beforeRaw)) ? new Date(beforeRaw) : undefined;
  const [{ items, nextBefore }, counts] = await Promise.all([listApplications({ status, q, before }), countApplicationsByStatus()]);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const href = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    return `/cms/alliance/candidaturas${u.size ? `?${u}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Candidaturas" description="Quem pediu para entrar no programa pela página /partners. Aprovar cria o parceiro; o acesso ao Alliance Hub é um convite separado." />

      <nav aria-label="Situação" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Tile href={href({ q })} label="Todas" value={total} active={!status} />
        {APPLICATION_STATUSES.map((s) => (
          <Tile key={s.key} href={href({ status: s.key, q })} label={s.label} value={counts[s.key] ?? 0} active={status === s.key} />
        ))}
      </nav>

      <form action="/cms/alliance/candidaturas" className="mb-4 flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <Input name="q" defaultValue={q} placeholder="Buscar por empresa, nome ou e-mail" aria-label="Buscar candidaturas" className="pl-9" />
        </div>
        <button type="submit" className={buttonClass("secondary", "md")}>
          Buscar
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon={<Inbox className="size-8" />} title={total === 0 ? "Nenhuma candidatura ainda. Elas chegam pela página /partners." : "Nenhuma candidatura com esses filtros."} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {items.map((a) => (
              <li key={a.id}>
                <Link href={`/cms/alliance/candidaturas/${a.id}`} className="group grid gap-2 px-4 py-3.5 hover:bg-zinc-50 sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-4">
                  <p className="text-xs text-zinc-500" title={formatDateTime(a.createdAt)}>
                    {relativeTime(a.createdAt)}
                  </p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {a.company} <span className="font-normal text-zinc-500">· {a.name}</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {MODALITIES[a.modalityKey as ModalityKey]?.name ?? a.modalityKey} · {a.sector}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ToneBadge list={APPLICATION_STATUSES} value={a.status} />
                    <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {nextBefore && (
            <div className="border-t border-zinc-100 px-4 py-3 text-right">
              <Link href={href({ status, q, antes: nextBefore.toISOString() })} className={buttonClass("ghost", "sm")}>
                Mais antigas
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({ href, label, value, active }: { href: string; label: string; value: number; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("rounded-lg border px-3 py-2.5 transition-colors", active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300")}
    >
      <span className={cn("block truncate text-xs", active ? "text-white/70" : "text-zinc-500")}>{label}</span>
      <span className="mt-0.5 block text-lg font-semibold tabular-nums">{value}</span>
    </Link>
  );
}
