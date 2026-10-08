import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Inbox, Plus, Search } from "lucide-react";
import { ButtonLink, buttonClass } from "@/components/cms/ui/button";
import { Input, Select } from "@/components/cms/ui/field";
import { Badge, EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { REFERRAL_STATUSES, REFERRAL_STATUS_KEYS, type ReferralStatus } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { isUuid } from "@/server/media/service";
import { partnerOptions } from "@/server/alliance/partners";
import { countReferralsByStatus, listReferrals } from "@/server/alliance/referrals";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Indicações · Rocket Alliance" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function CmsReferralsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("alliance.view", "/cms/alliance/indicacoes");
  const sp = await searchParams;
  const status = REFERRAL_STATUS_KEYS.includes(one(sp.status) as ReferralStatus) ? (one(sp.status) as ReferralStatus) : undefined;
  const partnerId = isUuid(one(sp.parceiro)) ? one(sp.parceiro) : undefined;
  const q = one(sp.q)?.slice(0, 100) ?? "";
  const beforeRaw = one(sp.antes);
  const before = beforeRaw && !Number.isNaN(Date.parse(beforeRaw)) ? new Date(beforeRaw) : undefined;
  const [{ items, nextBefore }, counts, partners] = await Promise.all([listReferrals({ status, partnerId, q, before }), countReferralsByStatus(partnerId), partnerOptions()]);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const href = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ parceiro: partnerId, q, ...p }).filter((e): e is [string, string] => Boolean(e[1])));
    return `/cms/alliance/indicacoes${u.size ? `?${u}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Indicações"
        description="Todas as indicações dos parceiros: qualificação, negociação, conversão e encerramento."
        actions={
          user.permissions.has("alliance.referrals") && (
            <ButtonLink href="/cms/alliance/indicacoes/nova" size="sm">
              <Plus className="size-4" /> Nova indicação
            </ButtonLink>
          )
        }
      />
      <nav aria-label="Etapas" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Tile href={href({ status: undefined })} label="Todas" value={total} active={!status} />
        {REFERRAL_STATUSES.map((s) => (
          <Tile key={s.key} href={href({ status: s.key })} label={s.label} value={counts[s.key] ?? 0} active={status === s.key} highlight={s.key === "submitted" && (counts.submitted ?? 0) > 0} />
        ))}
      </nav>
      <form action="/cms/alliance/indicacoes" className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <Input name="q" defaultValue={q} placeholder="Empresa, identificador, e-mail ou domínio" aria-label="Buscar indicações" className="pl-9" />
        </div>
        <Select name="parceiro" defaultValue={partnerId ?? ""} aria-label="Parceiro" className="sm:w-56">
          <option value="">Todos os parceiros</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.tradeName}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClass("secondary", "md")}>
          Filtrar
        </button>
      </form>
      {items.length === 0 ? (
        <EmptyState icon={<Inbox className="size-8" />} title={total === 0 ? "Nenhuma indicação ainda. Elas chegam pelo Alliance Hub ou são registradas aqui pela equipe." : "Nenhuma indicação com esses filtros."} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {items.map((r) => (
              <li key={r.id}>
                <Link href={`/cms/alliance/indicacoes/${r.id}`} className="group grid gap-2 px-4 py-3.5 hover:bg-zinc-50 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-4">
                  <span className="font-mono text-xs text-zinc-500">{r.code}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {r.companyName} <span className="font-normal text-zinc-500">· {r.partnerName}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500" title={formatDateTime(r.createdAt)}>
                      {relativeTime(r.createdAt)}
                      {r.ownerName ? ` · responsável: ${r.ownerName}` : " · sem responsável"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {r.possibleDuplicate && <Badge tone="amber">Possível duplicidade</Badge>}
                    <ToneBadge list={REFERRAL_STATUSES} value={r.status} />
                    <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {nextBefore && (
            <div className="border-t border-zinc-100 px-4 py-3 text-right">
              <Link href={href({ status, antes: nextBefore.toISOString() })} className={buttonClass("ghost", "sm")}>
                Mais antigas <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({ href, label, value, active, highlight }: { href: string; label: string; value: number; active: boolean; highlight?: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("rounded-lg border px-3 py-2.5 transition-colors", active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300")}>
      <span className={cn("block truncate text-xs", active ? "text-white/70" : "text-zinc-500")}>{label}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold tabular-nums">
        {value}
        {highlight && !active && <span className="size-1.5 rounded-full bg-sky-500" aria-label="há indicações novas" />}
      </span>
    </Link>
  );
}
