import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/cms/ui/layout";
import { relativeTime } from "@/lib/cms/format";
import { formatMoney } from "@/lib/alliance/money";
import { requirePermission } from "@/server/authz/guard";
import { getOverview } from "@/server/alliance/overview";

export const metadata: Metadata = { title: "Rocket Alliance" };

/**
 * Visão geral do programa: parceiros, candidaturas, indicações, oportunidades, conversão e, para quem
 * pode ver finanças, comissões e pagamentos. Os avisos no topo levam ao que está esperando a equipe.
 */
export default async function AllianceOverviewPage() {
  const user = await requirePermission("alliance.view", "/cms/alliance");
  const finance = user.permissions.has("alliance.finance");
  const { counts: c, conversion, finance: f, activity } = await getOverview({ finance });

  const alerts = [
    user.permissions.has("alliance.applications") && c.applications_pending > 0 && {
      href: "/cms/alliance/candidaturas",
      text: c.applications_pending === 1 ? "1 candidatura esperando análise" : `${c.applications_pending} candidaturas esperando análise`,
    },
    c.referrals_new > 0 && { href: "/cms/alliance/indicacoes?status=submitted", text: c.referrals_new === 1 ? "1 indicação nova para analisar" : `${c.referrals_new} indicações novas para analisar` },
    c.change_requests > 0 && { href: "/cms/alliance/parceiros#pedidos", text: c.change_requests === 1 ? "1 pedido de alteração de dados públicos" : `${c.change_requests} pedidos de alteração de dados públicos` },
    f && f.rulesDraft > 0 && { href: "/cms/alliance/comissoes/regras", text: f.rulesDraft === 1 ? "1 regra de comissão aguardando aprovação comercial" : `${f.rulesDraft} regras de comissão aguardando aprovação comercial` },
    user.permissions.has("alliance.communications") && c.tickets_open > 0 && { href: "/cms/alliance/comunicacoes/suporte", text: c.tickets_open === 1 ? "1 chamado de suporte aberto" : `${c.tickets_open} chamados de suporte abertos` },
    user.permissions.has("alliance.communications") && c.emails_failed > 0 && { href: "/cms/alliance/comunicacoes/envios?status=failed", text: c.emails_failed === 1 ? "1 e-mail do programa não foi entregue" : `${c.emails_failed} e-mails do programa não foram entregues` },
  ].filter(Boolean) as { href: string; text: string }[];

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
      <PageHeader title="Visão geral" description="O Rocket Alliance em números: parceiros, candidaturas, indicações e resultados." />

      {alerts.length > 0 && (
        <ul className="mb-6 space-y-2">
          {alerts.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="group flex items-center justify-between gap-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-100/70">
                {a.text}
                <ArrowRight aria-hidden="true" className="size-4 text-sky-700 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-6 grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const body = (
            <>
              <p className="text-[13px] text-zinc-500">{m.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{m.value}</p>
              {m.hint && <p className="mt-0.5 text-xs text-zinc-500">{m.hint}</p>}
            </>
          );
          return m.href ? (
            <Link key={m.label} href={m.href} className="bg-white px-5 py-4 transition-colors hover:bg-zinc-50">
              {body}
            </Link>
          ) : (
            <div key={m.label} className="bg-white px-5 py-4">
              {body}
            </div>
          );
        })}
      </div>

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
