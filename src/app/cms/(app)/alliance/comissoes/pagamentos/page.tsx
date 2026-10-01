import type { Metadata } from "next";
import { Badge, PageHeader, Panel } from "@/components/cms/ui/layout";
import { PayoutForm, VoidPayoutButton } from "@/components/cms/alliance/commission-admin";
import { formatDay } from "@/lib/cms/format";
import { formatMoney } from "@/lib/alliance/money";
import { requirePermission } from "@/server/authz/guard";
import { listEntries, listPayouts } from "@/server/alliance/commissions";

export const metadata: Metadata = { title: "Pagamentos · Rocket Alliance" };

const day = (d: string) => formatDay(new Date(`${d}T12:00:00Z`));

export default async function PayoutsPage() {
  await requirePermission("alliance.finance", "/cms/alliance/comissoes/pagamentos");
  const [approved, payouts] = await Promise.all([listEntries({ status: "approved", limit: 1000 }), listPayouts()]);
  const payable = approved.filter((e) => e.payoutId === null);
  return (
    <div>
      <PageHeader title="Pagamentos" description="Registre o repasse feito fora do sistema (Pix ou transferência). Cada lançamento entra em um único pagamento." />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Panel title="Histórico">
          {payouts.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum pagamento registrado.</p>
          ) : (
            <ul className="-my-2 divide-y divide-zinc-100">
              {payouts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13px]">
                  <span>
                    <span className="font-medium text-zinc-900">{p.partnerName}</span>
                    <span className="block text-xs text-zinc-500">
                      {day(p.paidOn)} · {p.method}
                      {p.reference ? ` · ${p.reference}` : ""} · {p.entries} lançamento(s)
                      {p.voidReason ? ` · anulado: ${p.voidReason}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={`font-medium tabular-nums ${p.status === "voided" ? "text-zinc-400 line-through" : ""}`}>{formatMoney(p.amountCents)}</span>
                    {p.status === "voided" ? <Badge>Anulado</Badge> : <VoidPayoutButton id={p.id} amountCents={p.amountCents} />}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Registrar pagamento">
          <PayoutForm key={payable.map((e) => e.id).join()} entries={payable} />
        </Panel>
      </div>
    </div>
  );
}
