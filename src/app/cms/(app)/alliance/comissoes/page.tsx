import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/cms/ui/button";
import { Select } from "@/components/cms/ui/field";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { AdjustmentForm, EntriesTable } from "@/components/cms/alliance/commission-admin";
import { COMMISSION_STATUSES } from "@/lib/alliance/constants";
import { formatMoney } from "@/lib/alliance/money";
import { requirePermission } from "@/server/authz/guard";
import { isUuid } from "@/server/media/service";
import { balancesByPartner, listEntries } from "@/server/alliance/commissions";
import { partnerOptions } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Comissões · Rocket Alliance" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("alliance.finance", "/cms/alliance/comissoes");
  const sp = await searchParams;
  const status = COMMISSION_STATUSES.some((s) => s.key === one(sp.status)) ? one(sp.status) : sp.status === "todas" ? undefined : "pending";
  const partnerId = isUuid(one(sp.parceiro)) ? one(sp.parceiro) : undefined;
  const [entries, balances, partners] = await Promise.all([listEntries({ status, partnerId }), balancesByPartner(), partnerOptions()]);
  const sum = (k: "pendingCents" | "approvedCents" | "paidCents") => balances.reduce((a, b) => a + b[k], 0);

  return (
    <div>
      <PageHeader title="Comissões" description="Lançamentos gerados pelos recebimentos registrados. Aprovação, cancelamento e ajustes ficam no histórico com autor e motivo." />
      <dl className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Pendentes de aprovação", sum("pendingCents")],
          ["Aprovadas, a pagar", sum("approvedCents")],
          ["Pagas", sum("paidCents")],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(value as number)}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div>
          <form action="/cms/alliance/comissoes" className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Select name="status" defaultValue={status ?? "todas"} aria-label="Status" className="sm:w-48">
              <option value="todas">Todos os status</option>
              {COMMISSION_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
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
          <EntriesTable key={`${status}-${partnerId}`} entries={entries.map((e) => ({ ...e, partnerName: e.partnerName }))} />
        </div>
        <div className="space-y-6">
          <Panel title="Saldos por parceiro">
            {balances.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma comissão ainda.</p>
            ) : (
              <ul className="-my-2 divide-y divide-zinc-100 text-[13px]">
                {balances.map((b) => (
                  <li key={b.partnerId} className="py-2">
                    <Link href={`/cms/alliance/comissoes?parceiro=${b.partnerId}&status=todas`} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
                      {b.tradeName}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-500 tabular-nums">
                      pendente {formatMoney(b.pendingCents)} · a pagar {formatMoney(b.approvedCents)} · pago {formatMoney(b.paidCents)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Ajuste manual" description="Bônus, correções ou descontos que não vêm de um recebimento.">
            <AdjustmentForm partners={partners} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
