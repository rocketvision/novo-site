import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Handshake, Plus, Search } from "lucide-react";
import { buttonClass, ButtonLink } from "@/components/cms/ui/button";
import { Input, Select } from "@/components/cms/ui/field";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { ChangeRequestList } from "@/components/cms/alliance/change-requests";
import { CONTRACT_STATUSES, MODALITIES, PARTNER_STATUSES, PARTNER_STATUS_KEYS, TIERS, TIER_KEYS, isModalityKey, type PartnerStatus, type TierKey } from "@/lib/alliance/constants";
import { formatMoney } from "@/lib/alliance/money";
import { relativeTime } from "@/lib/cms/format";
import { requirePermission } from "@/server/authz/guard";
import { listChangeRequests, listPartners, type PartnerSort } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Parceiros · Rocket Alliance" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const SORTS: { key: PartnerSort; label: string }[] = [
  { key: "name", label: "Nome (A–Z)" },
  { key: "referrals", label: "Mais indicações em andamento" },
  { key: "login", label: "Último acesso ao Hub" },
  { key: "recent", label: "Mais recentes" },
  { key: "directory", label: "Ordem do diretório" },
];

export default async function PartnersPage({ searchParams }: { searchParams: Search }) {
  const user = await requirePermission("alliance.view", "/cms/alliance/parceiros");
  const sp = await searchParams;
  const status = PARTNER_STATUS_KEYS.includes(one(sp.status) as PartnerStatus) ? (one(sp.status) as PartnerStatus) : undefined;
  const tier = TIER_KEYS.includes(one(sp.nivel) as TierKey) ? (one(sp.nivel) as TierKey) : undefined;
  const q = one(sp.q)?.slice(0, 100) ?? "";
  const sort = SORTS.find((x) => x.key === one(sp.ordem))?.key ?? "name";
  const pending = one(sp.pendencia) === "1";
  const canEdit = user.permissions.has("alliance.partners");
  const finance = user.permissions.has("alliance.finance");
  const contracts = user.permissions.has("alliance.contracts");
  const [partners, requests] = await Promise.all([listPartners({ q, status, tier, pending, sort, finance }), canEdit ? listChangeRequests({ status: "pending" }) : Promise.resolve([])]);
  const filtered = Boolean(q || status || tier || pending);

  return (
    <div>
      <PageHeader
        title="Parceiros"
        description="Cadastro das empresas parceiras: situação, nível, modalidades, perfil público e acesso ao Alliance Hub."
        actions={
          canEdit && (
            <ButtonLink href="/cms/alliance/parceiros/novo" size="sm">
              <Plus className="size-4" /> Novo parceiro
            </ButtonLink>
          )
        }
      />

      {requests.length > 0 && (
        <Panel title="Pedidos de alteração" description="Mudanças de dados públicos enviadas pelas empresas no Hub. Só valem depois de aprovadas." className="mb-6">
          <div id="pedidos">
            <ChangeRequestList requests={requests.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), reviewedAt: r.reviewedAt?.toISOString() ?? null }))} />
          </div>
        </Panel>
      )}

      <form action="/cms/alliance/parceiros" className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <Input name="q" defaultValue={q} placeholder="Buscar por nome, razão social, endereço ou e-mail" aria-label="Buscar parceiros" className="pl-9" />
        </div>
        <Select name="status" defaultValue={status ?? ""} aria-label="Situação" className="sm:w-40">
          <option value="">Todas as situações</option>
          {PARTNER_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select name="nivel" defaultValue={tier ?? ""} aria-label="Nível" className="sm:w-44">
          <option value="">Todos os níveis</option>
          {TIER_KEYS.map((k) => (
            <option key={k} value={k}>
              {TIERS[k].name}
            </option>
          ))}
        </Select>
        <Select name="ordem" defaultValue={sort} aria-label="Ordenar por" className="sm:w-56">
          {SORTS.map((x) => (
            <option key={x.key} value={x.key}>
              {x.label}
            </option>
          ))}
        </Select>
        <label className="flex shrink-0 items-center gap-2 px-1 text-[13px] text-zinc-700">
          <input type="checkbox" name="pendencia" value="1" defaultChecked={pending} className="size-4 accent-zinc-900" />
          Com pendência
        </label>
        <button type="submit" className={buttonClass("secondary", "md")}>
          Filtrar
        </button>
      </form>

      {partners.length === 0 ? (
        <EmptyState
          icon={<Handshake className="size-8" />}
          title={filtered ? "Nenhum parceiro com esses filtros." : "Nenhum parceiro ainda. Eles nascem das candidaturas aprovadas ou do cadastro manual."}
          action={
            filtered && (
              <Link href="/cms/alliance/parceiros" className={buttonClass("secondary", "sm")}>
                Limpar filtros
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {partners.map((p) => (
              <li key={p.id}>
                <Link href={`/cms/alliance/parceiros/${p.id}`} className="group flex items-center gap-4 px-4 py-3 hover:bg-zinc-50">
                  <span className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-100 bg-zinc-50">
                    {p.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.logoUrl} alt="" className="max-h-8 max-w-14 object-contain" />
                    ) : (
                      <span className="text-xs font-semibold text-zinc-400">{p.tradeName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-zinc-900">{p.tradeName}</span>
                      {p.pendingCount > 0 && (
                        <span className="shrink-0 rounded-full bg-sky-100 px-1.5 text-[11px] font-semibold text-sky-800 tabular-nums" title="Itens esperando a equipe">
                          {p.pendingCount} {p.pendingCount === 1 ? "pendência" : "pendências"}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">
                      {TIERS[p.tierKey as TierKey]?.name ?? p.tierKey} · {p.modalities.map((m) => (isModalityKey(m) ? MODALITIES[m].name : m)).join(", ") || "Sem modalidade"}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                      <span>
                        <strong className="font-medium text-zinc-800 tabular-nums">{p.openReferrals}</strong> {p.openReferrals === 1 ? "indicação em andamento" : "indicações em andamento"}
                        {p.newReferrals > 0 && <span className="text-sky-700"> ({p.newReferrals} nova{p.newReferrals === 1 ? "" : "s"})</span>}
                      </span>
                      {p.toPayCents !== null && p.toPayCents > 0 && (
                        <span>
                          <strong className="font-medium text-zinc-800 tabular-nums">{formatMoney(p.toPayCents)}</strong> em comissões abertas
                        </span>
                      )}
                      <span>{p.users === 0 ? "Sem acesso ao Hub" : p.lastLoginAt ? `Hub: ${relativeTime(p.lastLoginAt)}` : `${p.users === 1 ? "1 pessoa" : `${p.users} pessoas`} no Hub, sem acesso ainda`}</span>
                    </span>
                  </span>
                  <span className="hidden flex-col items-end gap-1.5 sm:flex">
                    <ToneBadge list={PARTNER_STATUSES} value={p.status} />
                    <span className="flex items-center gap-1.5">
                      {contracts && (p.contract ? <ToneBadge list={CONTRACT_STATUSES} value={p.contract} /> : <Badge>Sem contrato</Badge>)}
                      {p.published ? <Badge tone="green">No diretório</Badge> : null}
                      {p.hasChanges && <Badge tone="amber">Alterações</Badge>}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
