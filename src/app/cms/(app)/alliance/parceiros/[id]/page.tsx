import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { eq } from "drizzle-orm";
import { EmptyState, Panel, StatGrid } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { PendingList } from "@/components/cms/alliance/pending-list";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { formatMoney } from "@/lib/alliance/money";
import { CONTRACT_STATUSES, REFERRAL_STATUSES } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { getDb, schema } from "@/server/db";
import { isUuid } from "@/server/media/service";
import { partnerSummary, pendingWork } from "@/server/alliance/workspace";

export const metadata: Metadata = { title: "Parceiro · Rocket Alliance" };

const day = (v: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${v}T00:00:00Z`));

/** Resumo do parceiro: números, pendências e o que está acontecendo, com atalho para cada frente. */
export default async function PartnerSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("alliance.view", `/cms/alliance/parceiros/${id}`);
  if (!isUuid(id)) notFound();
  const [partner] = await getDb()
    .select({
      contactName: schema.partners.contactName,
      contactEmail: schema.partners.contactEmail,
      contactPhone: schema.partners.contactPhone,
      qualityScore: schema.partners.qualityScore,
      satisfactionScore: schema.partners.satisfactionScore,
      complianceOk: schema.partners.complianceOk,
      internalNotes: schema.partners.internalNotes,
      createdAt: schema.partners.createdAt,
    })
    .from(schema.partners)
    .where(eq(schema.partners.id, id));
  if (!partner) notFound();
  const [summary, pending] = await Promise.all([partnerSummary(id, user.permissions), pendingWork(user.permissions, id)]);
  const { referrals: r, hub, finance, contracts } = summary;
  const base = `/cms/alliance/parceiros/${id}`;

  const metrics: { label: string; value: string; hint: string; href?: string }[] = [
    { label: "Indicações em andamento", value: String(r.open), hint: r.lastAt ? `última ${relativeTime(r.lastAt)}` : "nenhuma ainda", href: `/cms/alliance/indicacoes?parceiro=${id}` },
    { label: "Ganhas", value: String(r.won), hint: r.conversion === null ? `${r.total} no total` : `${Math.round(r.conversion * 100)}% de conversão`, href: `/cms/alliance/indicacoes?status=won&parceiro=${id}` },
    ...(finance
      ? [
          { label: "Comissão a pagar", value: formatMoney(finance.approvedCents), hint: finance.pendingCents > 0 ? `${formatMoney(finance.pendingCents)} para aprovar` : "nada para aprovar", href: `/cms/alliance/comissoes?parceiro=${id}` },
          { label: "Comissão paga", value: formatMoney(finance.paidCents), hint: finance.lastPayoutOn ? `último pagamento ${day(finance.lastPayoutOn)}` : "nenhum pagamento ainda", href: `/cms/alliance/comissoes/pagamentos` },
        ]
      : [{ label: "Valor fechado", value: formatMoney(r.wonValueCents), hint: "soma das indicações ganhas" }]),
    {
      label: "Acesso ao Hub",
      value: hub.activeUsers === 1 ? "1 pessoa" : `${hub.activeUsers} pessoas`,
      hint: hub.lastLoginAt ? `último acesso ${relativeTime(hub.lastLoginAt)}` : hub.invitedUsers > 0 ? `${hub.invitedUsers} convite(s) pendente(s)` : "ninguém acessou ainda",
      href: `${base}/equipe`,
    },
  ];

  return (
    <div className="space-y-6">
      <StatGrid items={metrics} />

      <section aria-labelledby="pendencias">
        <h2 id="pendencias" className="mb-3 text-sm font-semibold text-zinc-900">
          Pendências deste parceiro
        </h2>
        <PendingList groups={pending} empty="Nenhuma pendência com este parceiro." />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Panel title="Indicações recentes" actions={<SeeAll href={`/cms/alliance/indicacoes?parceiro=${id}`} />}>
            {r.recent.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Este parceiro ainda não indicou ninguém." />
              </div>
            ) : (
              <ul className="-my-1 divide-y divide-zinc-100">
                {r.recent.map((x) => (
                  <li key={x.id}>
                    <Link href={`/cms/alliance/indicacoes/${x.id}`} className="group -mx-5 flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50">
                      <span className="w-24 shrink-0 font-mono text-xs text-zinc-500">{x.code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-zinc-900">{x.companyName}</span>
                        <span className="block truncate text-xs text-zinc-500" title={formatDateTime(x.createdAt)}>
                          {relativeTime(x.createdAt)} · {x.ownerName ? `responsável: ${x.ownerName}` : "sem responsável"}
                        </span>
                      </span>
                      <ToneBadge list={REFERRAL_STATUSES} value={x.status} />
                      <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Atividade recente" description="O que a equipe e o parceiro fizeram: cadastro, indicações, contratos, pagamentos, chamados e equipe.">
            {summary.activity.length === 0 ? (
              <p className="text-[13px] text-zinc-500">Nada registrado ainda.</p>
            ) : (
              <ol className="space-y-3">
                {summary.activity.map((a) => (
                  <li key={a.id} className="text-[13px]">
                    <p className="text-zinc-800">{a.summary}</p>
                    <p className="text-xs text-zinc-500" title={formatDateTime(a.createdAt)}>
                      {a.actorEmail ?? "Sistema"} · {relativeTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {contracts && (
            <Panel title="Contratos" actions={<SeeAll href={`/cms/alliance/contratos?parceiro=${id}`} />}>
              {contracts.length === 0 ? (
                <p className="text-[13px] text-zinc-500">
                  Nenhum contrato.{" "}
                  {user.permissions.has("alliance.contracts") && (
                    <Link href={`/cms/alliance/contratos/novo?parceiro=${id}`} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
                      Criar termo de parceria
                    </Link>
                  )}
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {contracts.map((c) => (
                    <li key={c.id}>
                      <Link href={`/cms/alliance/contratos/${c.id}`} className="group block">
                        <span className="block truncate text-[13px] font-medium text-zinc-900 group-hover:underline">{c.title}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                          <ToneBadge list={CONTRACT_STATUSES} value={c.status} />
                          {c.status === "active" && c.endsOn ? `até ${day(c.endsOn)}` : c.acceptedAt ? `aceito ${relativeTime(c.acceptedAt)}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel title="Contato principal" actions={<SeeAll href={`${base}/editar`} label="Editar" />}>
            {partner.contactName || partner.contactEmail || partner.contactPhone ? (
              <dl className="space-y-1.5 text-[13px]">
                {partner.contactName && <dd className="font-medium text-zinc-900">{partner.contactName}</dd>}
                {partner.contactEmail && (
                  <dd>
                    <a href={`mailto:${partner.contactEmail}`} className="text-zinc-700 underline-offset-4 hover:underline">
                      {partner.contactEmail}
                    </a>
                  </dd>
                )}
                {partner.contactPhone && <dd className="text-zinc-700">{partner.contactPhone}</dd>}
              </dl>
            ) : (
              <p className="text-[13px] text-zinc-500">Sem contato cadastrado.</p>
            )}
          </Panel>

          <Panel title="Avaliação" actions={<SeeAll href={`${base}/editar`} label="Editar" />}>
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-xs text-zinc-500">Qualidade das indicações</dt>
                <dd className="font-medium text-zinc-900">{partner.qualityScore ? `${partner.qualityScore}/5` : "Sem nota"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Satisfação dos clientes</dt>
                <dd className="font-medium text-zinc-900">{partner.satisfactionScore ? `${partner.satisfactionScore}/5` : "Sem nota"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-zinc-500">Regras do programa</dt>
                <dd className={partner.complianceOk ? "font-medium text-emerald-700" : "font-medium text-red-700"}>{partner.complianceOk ? "Cumpre" : "Não cumpre"}</dd>
              </div>
            </dl>
            {partner.internalNotes && <p className="mt-3 border-t border-zinc-100 pt-3 text-[13px] whitespace-pre-line text-zinc-700">{partner.internalNotes}</p>}
            <p className="mt-3 text-xs text-zinc-400">Parceiro desde {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(partner.createdAt)}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SeeAll({ href, label = "Ver todas" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900">
      {label} <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}
