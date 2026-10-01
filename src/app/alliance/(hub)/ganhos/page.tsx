import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { formatDay } from "@/lib/cms/format";
import { COMMISSION_STATUSES, commissionKindLabel } from "@/lib/alliance/constants";
import { formatMoney, formatRate } from "@/lib/alliance/money";
import { requireHubPermission } from "@/server/alliance/hub/guard";
import { hubAudienceOf } from "@/server/alliance/library";
import { hubEarnings } from "@/server/alliance/commissions";
import { getProgramSettings } from "@/server/alliance/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ganhos" };

const FILTERS = [
  { key: "", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "approved", label: "Aprovados" },
  { key: "paid", label: "Pagos" },
];

const day = (d: string | null) => (d ? formatDay(new Date(`${d}T12:00:00Z`)) : "");

/**
 * Ganhos da empresa. Previstas são estimativas (contratos ganhos ainda sem recebimento) e aparecem
 * separadas e marcadas como tal; pendente, aprovada e paga vêm dos lançamentos reais.
 */
export default async function HubEarningsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { user } = await requireHubPermission("earnings.view");
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.status) ? (sp.status ?? "") : "";
  const who = await hubAudienceOf(user);
  const [e, settings] = await Promise.all([hubEarnings(user.partner.id, user.partner.tierKey, who.modalities), getProgramSettings()]);
  const entries = filter ? e.entries.filter((x) => x.status === filter) : e.entries;

  return (
    <div className="space-y-6">
      <PageHeader title="Ganhos" description="Comissões da sua empresa: do recebimento pela Rocket Vision até o pagamento." />

      <div className="grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Previstas" value={formatMoney(e.forecastCents)} hint="Estimativa, não é pagamento garantido" muted />
        <Card label="Pendentes" value={formatMoney(e.pendingCents)} hint="Aguardando aprovação" />
        <Card label="Aprovadas" value={formatMoney(e.approvedCents)} hint="Entram no próximo pagamento" />
        <Card label="Pagas" value={formatMoney(e.paidCents)} hint={`${e.payouts.length} ${e.payouts.length === 1 ? "pagamento" : "pagamentos"}`} />
      </div>
      <p className="text-[13px] text-zinc-500">
        As comissões incidem sobre a receita líquida elegível efetivamente recebida pela Rocket Vision, de acordo com o termo de parceria.
        {e.currentRateBp !== null && ` Taxa vigente da sua empresa: ${formatRate(e.currentRateBp)}.`} {settings.paymentTerms}
      </p>

      {e.forecast.length > 0 && (
        <Panel title="Previstas" description="Contratos fechados que ainda não tiveram recebimento. O valor final depende do que a Rocket efetivamente receber.">
          <ul className="-my-2 divide-y divide-zinc-100">
            {e.forecast.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <Link href={`/alliance/indicacoes/${f.id}`} className="min-w-0 truncate text-zinc-800 hover:underline">
                  <span className="font-mono text-xs text-zinc-500">{f.code}</span> {f.companyName}
                </Link>
                <span className="shrink-0 text-zinc-500 tabular-nums">~ {formatMoney(f.estimateCents)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-zinc-900">Lançamentos</h2>
          <nav aria-label="Filtro" className="flex gap-1">
            {FILTERS.map((f) => (
              <Link key={f.key} href={f.key ? `/alliance/ganhos?status=${f.key}` : "/alliance/ganhos"} aria-current={filter === f.key ? "page" : undefined} className={cn("rounded-md px-2.5 py-1 text-[13px]", filter === f.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100")}>
                {f.label}
              </Link>
            ))}
          </nav>
        </header>
        {entries.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<Wallet className="size-8" />} title="Nenhum lançamento aqui. As comissões aparecem quando a Rocket registra um recebimento de uma indicação sua." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="text-xs text-zinc-500">
                <tr className="border-b border-zinc-100">
                  <th className="px-5 py-2.5 font-medium">Indicação</th>
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 text-right font-medium">Base</th>
                  <th className="px-3 py-2.5 text-right font-medium">Taxa</th>
                  <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                  <th className="px-5 py-2.5 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {entries.map((x) => (
                  <tr key={x.id}>
                    <td className="px-5 py-3">
                      {x.referralCode ? (
                        <>
                          <span className="font-mono text-xs text-zinc-500">{x.referralCode}</span> <span className="text-zinc-800">{x.companyName}</span>
                        </>
                      ) : (
                        <span className="text-zinc-800">{x.reason || "Ajuste"}</span>
                      )}
                      <span className="block text-xs text-zinc-500">{x.receivedOn ? `Recebido em ${day(x.receivedOn)}` : formatDay(x.createdAt)}{x.installmentNumber ? ` · mensalidade ${x.installmentNumber}` : ""}</span>
                    </td>
                    <td className="px-3 py-3 text-zinc-600">{commissionKindLabel(x.kind)}</td>
                    <td className="px-3 py-3 text-right text-zinc-600 tabular-nums">{x.baseCents ? formatMoney(x.baseCents) : ""}</td>
                    <td className="px-3 py-3 text-right text-zinc-600 tabular-nums">{x.rateBp !== null ? formatRate(x.rateBp) : ""}</td>
                    <td className={cn("px-3 py-3 text-right font-medium tabular-nums", x.amountCents < 0 ? "text-red-700" : "text-zinc-900")}>{formatMoney(x.amountCents)}</td>
                    <td className="px-5 py-3">
                      <ToneBadge list={COMMISSION_STATUSES} value={x.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Panel title="Pagamentos" className="scroll-mt-20">
        <div id="pagamentos" />
        {e.payouts.length === 0 ? (
          <p className="text-[13px] text-zinc-500">Nenhum pagamento registrado ainda.</p>
        ) : (
          <ul className="-my-2 divide-y divide-zinc-100">
            {e.payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span>
                  <span className="text-zinc-900">{day(p.paidOn)}</span>
                  <span className="block text-xs text-zinc-500">
                    {p.method}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                </span>
                <span className="font-medium tabular-nums">{formatMoney(p.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Card({ label, value, hint, muted }: { label: string; value: string; hint?: string; muted?: boolean }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[13px] text-zinc-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", muted && "text-zinc-500")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
