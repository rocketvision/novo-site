import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Inbox, Plus, Search } from "lucide-react";
import { buttonClass, ButtonLink } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/field";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { relativeTime } from "@/lib/cms/format";
import { hubCan, REFERRAL_STATUSES, REFERRAL_STATUS_KEYS, type ReferralStatus } from "@/lib/alliance/constants";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { countReferralsForHub, listReferralsForHub } from "@/server/alliance/referrals";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Indicações" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function HubReferralsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireHubSession();
  const sp = await searchParams;
  const status = REFERRAL_STATUS_KEYS.includes(one(sp.status) as ReferralStatus) ? (one(sp.status) as ReferralStatus) : undefined;
  const q = one(sp.q)?.slice(0, 100) ?? "";
  const [items, counts] = await Promise.all([listReferralsForHub(user, { status, q }), countReferralsForHub(user)]);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const all = hubCan(user.role, "referrals.view_all");
  const href = (s?: string) => `/alliance/indicacoes${s || q ? `?${new URLSearchParams({ ...(s && { status: s }), ...(q && { q }) })}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Indicações"
        description={all ? "As indicações da sua empresa, etapa por etapa." : "As indicações que você registrou, etapa por etapa."}
        actions={
          hubCan(user.role, "referrals.create") && (
            <ButtonLink href="/alliance/indicacoes/nova" size="sm">
              <Plus className="size-4" /> Nova indicação
            </ButtonLink>
          )
        }
      />
      <nav aria-label="Etapas" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <Chip href={href()} label="Todas" value={total} active={!status} />
        {REFERRAL_STATUSES.map((s) => (
          <Chip key={s.key} href={href(s.key)} label={s.label} value={counts[s.key] ?? 0} active={status === s.key} />
        ))}
      </nav>
      <form action="/alliance/indicacoes" className="mb-4 flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <Input name="q" defaultValue={q} placeholder="Buscar por empresa, contato ou identificador" aria-label="Buscar indicações" className="pl-9" />
        </div>
        <button type="submit" className={buttonClass("secondary", "md")}>
          Buscar
        </button>
      </form>
      {items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-8" />}
          title={total === 0 ? "Nenhuma indicação ainda. Registre a primeira: ela fica protegida no nome da sua empresa." : "Nenhuma indicação com esses filtros."}
          action={
            total === 0 &&
            hubCan(user.role, "referrals.create") && (
              <ButtonLink href="/alliance/indicacoes/nova" size="sm">
                Nova indicação
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {items.map((r) => (
              <li key={r.id}>
                <Link href={`/alliance/indicacoes/${r.id}`} className="group grid gap-2 px-4 py-3.5 hover:bg-zinc-50 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-4">
                  <span className="font-mono text-xs text-zinc-500">{r.code}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-900">{r.companyName}</span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">
                      {r.contactName} · {relativeTime(r.createdAt)}
                      {all && r.submittedByName ? ` · por ${r.submittedByName}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <ToneBadge list={REFERRAL_STATUSES} value={r.status} />
                    <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chip({ href, label, value, active }: { href: string; label: string; value: number; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors", active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300")}
    >
      {label}
      <span className={cn("tabular-nums", active ? "text-white/70" : "text-zinc-400")}>{value}</span>
    </Link>
  );
}
