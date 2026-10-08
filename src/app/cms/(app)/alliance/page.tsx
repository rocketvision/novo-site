import type { Metadata } from "next";
import { EmptyState, PageHeader, Panel, StatGrid } from "@/components/cms/ui/layout";
import { relativeTime } from "@/lib/cms/format";
import { formatMoney } from "@/lib/alliance/money";
import { requirePermission } from "@/server/authz/guard";
import { getOverview } from "@/server/alliance/overview";
import { pendingWork } from "@/server/alliance/workspace";
import { PendingList } from "@/components/cms/alliance/pending-list";

export const metadata: Metadata = { title: "Rocket Alliance" };

/**
 * Visão geral do programa: parceiros, candidaturas, indicações, oportunidades, conversão e, para quem
 * pode ver finanças, comissões e pagamentos. No topo, a caixa de pendências: o que está esperando a
 * equipe, com link direto para resolver cada item.
 */
export default async function AllianceOverviewPage() {
  const user = await requirePermission("alliance.view", "/cms/alliance");
  const finance = user.permissions.has("alliance.finance");
  const [{ counts: c, conversion, finance: f, activity }, pending] = await Promise.all([getOverview({ finance }), pendingWork(user.permissions)]);
  const pendingTotal = pending.reduce((n, g) => n + g.count, 0);

  const metrics: { label: string; value: string; hint?: string; href?: string }[] = [
    { label: "Parceiros ativos", value: String(c.partners_active), hint: `${c.partners_onboarding} em onboarding`, href: "/cms/alliance/parceiros?status=active" },
    { label: "No diretório", value: String(c.partners_published), hint: `${c.hub_users} pessoas no Hub`, href: "/cms/alliance/diretorio" },
    { label: "Candidaturas em aberto", value: String(c.applications_pending), hint: `${c.applications_total} no total`, href: "/cms/alliance/candidaturas" },
    { label: "Indicações em andamento", value: String(c.referrals_open), hint: `${c.referrals_total} no total`, href: "/cms/alliance/indicacoes" },
    { label: "Conversão", value: conversion === null ? "Sem dados" : `${Math.round(conversion * 100)}%`, hint: `${c.referrals_won} ganhas · ${c.referrals_lost} perdidas` },
    { label: "Oportunidades abertas", value: String(c.opportunities_open), hint: `${c.interests_new} interesses para responder`, href: "/cms/alliance/recursos/oportunidades" },
  ];
  if (f) {
    metrics.push(
      { label: "Comissões pendentes", value: formatMoney(f.pendingCents), hint: "Aguardando aprovação", href: "/cms/alliance/comissoes?status=pending" },
      { label: "Aprovadas a pagar", value: formatMoney(f.approvedCents), href: "/cms/alliance/comissoes?status=approved" },
      { label: "Pago no ano", value: formatMoney(f.paidYearCents), hint: `${f.payoutsYear} pagamentos`, href: "/cms/alliance/comissoes/pagamentos" },
      { label: "Receita recebida no ano", value: formatMoney(f.receivedYearCents), hint: "Base de comissões, já sem reembolsos", href: "/cms/alliance/comissoes/recebimentos" },
    );
  }

  return (
    <>
      <PageHeader title="Rocket Alliance" description="O que precisa da equipe agora e o programa de parceiros em números." />

      <section aria-labelledby="pendencias" className="mb-8">
        <h2 id="pendencias" className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          Para fazer agora
          {pendingTotal > 0 && <span className="rounded-full bg-sky-100 px-1.5 text-[11px] font-semibold text-sky-800 tabular-nums">{pendingTotal}</span>}
        </h2>
        <PendingList groups={pending} />
      </section>

      <h2 className="mb-3 text-sm font-semibold text-zinc-900">Números do programa</h2>
      <StatGrid items={metrics} className={metrics.length > 6 ? "mb-8 lg:grid-cols-5" : "mb-8 lg:grid-cols-3"} />

      <Panel title="Atividade recente do programa">
        {activity.length === 0 ? (
          <EmptyState title="Nada por aqui ainda. Candidaturas, publicações e indicações aparecem nesta lista." />
        ) : (
          <ol className="-my-1 space-y-3">
            {activity.map((a) => (
              <li key={a.id} className="text-[13px]">
                <p className="text-zinc-800">{a.summary}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {a.actorEmail ?? "Sistema"} · {relativeTime(a.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}
