import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Handshake, Plus, Search } from "lucide-react";
import { buttonClass, ButtonLink } from "@/components/cms/ui/button";
import { Input, Select } from "@/components/cms/ui/field";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { ChangeRequestList } from "@/components/cms/alliance/change-requests";
import { MODALITIES, PARTNER_STATUSES, PARTNER_STATUS_KEYS, TIERS, TIER_KEYS, isModalityKey, type PartnerStatus, type TierKey } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { listChangeRequests, listPartners } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Parceiros · Rocket Alliance" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function PartnersPage({ searchParams }: { searchParams: Search }) {
  const user = await requirePermission("alliance.view", "/cms/alliance/parceiros");
  const sp = await searchParams;
  const status = PARTNER_STATUS_KEYS.includes(one(sp.status) as PartnerStatus) ? (one(sp.status) as PartnerStatus) : undefined;
  const tier = TIER_KEYS.includes(one(sp.nivel) as TierKey) ? (one(sp.nivel) as TierKey) : undefined;
  const q = one(sp.q)?.slice(0, 100) ?? "";
  const canEdit = user.permissions.has("alliance.partners");
  const [partners, requests] = await Promise.all([listPartners({ q, status, tier }), canEdit ? listChangeRequests({ status: "pending" }) : Promise.resolve([])]);

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
        <button type="submit" className={buttonClass("secondary", "md")}>
          Filtrar
        </button>
      </form>

      {partners.length === 0 ? (
        <EmptyState
          icon={<Handshake className="size-8" />}
          title={q || status || tier ? "Nenhum parceiro com esses filtros." : "Nenhum parceiro ainda. Eles nascem das candidaturas aprovadas ou do cadastro manual."}
          action={
            (q || status || tier) && (
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
                    <span className="block truncate text-sm font-medium text-zinc-900">{p.tradeName}</span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">
                      {TIERS[p.tierKey as TierKey]?.name ?? p.tierKey} · {p.modalities.map((m) => (isModalityKey(m) ? MODALITIES[m].name : m)).join(", ") || "Sem modalidade"} · {p.users === 1 ? "1 pessoa no Hub" : `${p.users} pessoas no Hub`}
                    </span>
                  </span>
                  <span className="hidden items-center gap-2 sm:flex">
                    {p.published ? <Badge tone="green">No diretório</Badge> : null}
                    {p.hasChanges && <Badge tone="amber">Alterações</Badge>}
                    <ToneBadge list={PARTNER_STATUSES} value={p.status} />
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
