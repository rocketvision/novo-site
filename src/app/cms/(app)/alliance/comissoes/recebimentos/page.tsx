import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { formatDay } from "@/lib/cms/format";
import { COMMISSION_STATUSES, RECEIPT_KINDS } from "@/lib/alliance/constants";
import { formatMoney } from "@/lib/alliance/money";
import { requirePermission } from "@/server/authz/guard";
import { listReceipts } from "@/server/alliance/commissions";
import { listReferrals } from "@/server/alliance/referrals";

export const metadata: Metadata = { title: "Recebimentos · Rocket Alliance" };

const day = (d: string) => formatDay(new Date(`${d}T12:00:00Z`));

export default async function ReceiptsPage() {
  await requirePermission("alliance.finance", "/cms/alliance/comissoes/recebimentos");
  const [receipts, won] = await Promise.all([listReceipts(), listReferrals({ status: "won" })]);
  return (
    <div>
      <PageHeader title="Recebimentos" description="O que a Rocket efetivamente recebeu de clientes indicados. É a única base de cálculo das comissões." />
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Registrar recebimento</h2>
        {won.items.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma indicação ganha ainda. Recebimentos são registrados na página da indicação, depois que ela é marcada como ganha.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {won.items.map((r) => (
              <li key={r.id}>
                <Link href={`/cms/alliance/indicacoes/${r.id}`} className="inline-flex rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[13px] hover:border-zinc-400">
                  <span className="mr-1.5 font-mono text-xs text-zinc-500">{r.code}</span> {r.companyName} · {r.partnerName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {receipts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">Nenhum recebimento registrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[46rem] text-left text-[13px]">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Indicação</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2 text-right font-medium">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600">{day(r.receivedOn)}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/cms/alliance/indicacoes/${r.referralId}`} className="text-zinc-900 underline-offset-4 hover:underline">
                      {r.companyName}
                    </Link>
                    <span className="block text-xs text-zinc-500">
                      {r.referralCode} · {r.partnerName}
                      {r.externalRef ? ` · ${r.externalRef}` : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600">
                    {RECEIPT_KINDS.find((k) => k.key === r.kind)?.label}
                    {r.installmentNumber ? ` ${r.installmentNumber}` : ""}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${r.kind === "refund" ? "text-red-700" : ""}`}>
                    {r.kind === "refund" ? "-" : ""}
                    {formatMoney(r.amountCents)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {r.entryAmountCents !== null ? (
                      <span className="inline-flex items-center gap-2 tabular-nums">
                        {formatMoney(r.entryAmountCents)} <ToneBadge list={COMMISSION_STATUSES} value={r.entryStatus!} />
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">sem comissão</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
