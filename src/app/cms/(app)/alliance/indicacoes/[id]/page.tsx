import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, EyeOff } from "lucide-react";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { ReferralManager } from "@/components/cms/alliance/referral-manager";
import { ReceiptForm } from "@/components/cms/alliance/receipt-form";
import { formatDateTime, formatDay } from "@/lib/cms/format";
import { maskPhone } from "@/lib/diagnostic";
import { COMMISSION_STATUSES, RECEIPT_KINDS, REFERRAL_STATUSES, referralStatusLabel, TIERS, type ReferralStatus, type TierKey } from "@/lib/alliance/constants";
import { formatTaxId } from "@/lib/alliance/identity";
import { formatMoney } from "@/lib/alliance/money";
import { requirePermission } from "@/server/authz/guard";
import { isUuid } from "@/server/media/service";
import { getReferral, referralOwners } from "@/server/alliance/referrals";
import { partnerOptions } from "@/server/alliance/partners";
import { listReceipts } from "@/server/alliance/commissions";

export const metadata: Metadata = { title: "Indicação · Rocket Alliance" };

export default async function CmsReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("alliance.view", `/cms/alliance/indicacoes/${id}`);
  if (!isUuid(id)) notFound();
  const data = await getReferral(id);
  if (!data) notFound();
  const finance = user.permissions.has("alliance.finance");
  const [owners, partners, receipts] = await Promise.all([referralOwners(), partnerOptions(), finance ? listReceipts({ referralId: id }) : Promise.resolve([])]);
  const r = data.referral;
  const day = (d: string) => formatDay(new Date(`${d}T12:00:00Z`));

  return (
    <div>
      <PageHeader
        back={
          <Link href="/cms/alliance/indicacoes" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Indicações
          </Link>
        }
        title={r.companyName}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{r.code}</span>
            <ToneBadge list={REFERRAL_STATUSES} value={r.status} />
            <span>
              de{" "}
              <Link href={`/cms/alliance/parceiros/${r.partnerId}`} className="text-zinc-700 underline-offset-4 hover:underline">
                {data.partnerName}
              </Link>{" "}
              ({TIERS[data.partnerTier as TierKey]?.name}) · {formatDateTime(r.createdAt)}
            </span>
          </span>
        }
      />
      {data.duplicate && (
        <div role="alert" className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Possível duplicidade: mesmo nome da indicação{" "}
            <Link href={`/cms/alliance/indicacoes/${data.duplicate.id}`} className="font-medium underline">
              {data.duplicate.code}
            </Link>{" "}
            de {data.duplicate.partnerName} ({referralStatusLabel(data.duplicate.status)}, {formatDay(data.duplicate.createdAt)}). Pela regra de atribuição, vale o primeiro registro válido: decida se esta segue ou é cancelada.
          </p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Empresa e contato">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Item label="Contato" value={`${r.contactName}${r.contactRole ? `, ${r.contactRole}` : ""}`} />
              <Item label="E-mail" value={<a href={`mailto:${r.contactEmail}`} className="underline-offset-4 hover:underline">{r.contactEmail}</a>} />
              {r.contactPhone && <Item label="Telefone" value={maskPhone(r.contactPhone)} />}
              {r.companyWebsite && <Item label="Site" value={<a href={r.companyWebsite} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{r.companyWebsite.replace(/^https:\/\//, "")}</a>} />}
              {r.companyTaxId && <Item label="CNPJ" value={formatTaxId(r.companyTaxId)} />}
              {r.city && <Item label="Cidade" value={r.city} />}
              <Item label="Registrada por" value={data.submittedByName ? `${data.submittedByName} (${data.submittedByEmail})` : "Rocket Vision"} />
              <Item label="Protegida até" value={formatDay(r.protectedUntil)} />
              {r.estimatedValueCents !== null && <Item label="Estimativa do parceiro" value={formatMoney(r.estimatedValueCents)} />}
              {r.dealValueCents !== null && <Item label="Valor do contrato" value={formatMoney(r.dealValueCents)} />}
            </dl>
            <div className="mt-5 border-t border-zinc-100 pt-5 text-sm">
              <p className="text-xs text-zinc-500">Necessidade</p>
              <p className="mt-1 whitespace-pre-line text-zinc-800">{r.need}</p>
              {r.services.length > 0 && <p className="mt-2 text-xs text-zinc-500">Soluções: {r.services.join(", ")}</p>}
            </div>
          </Panel>

          {finance && r.status === "won" && (
            <Panel title="Recebimentos e comissões" description="Registre o que a Rocket efetivamente recebeu deste cliente. A comissão sai da regra vigente.">
              {receipts.length > 0 && (
                <ul className="mb-6 divide-y divide-zinc-100 rounded-md border border-zinc-200">
                  {receipts.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                      <span>
                        <span className="text-zinc-900">{RECEIPT_KINDS.find((k) => k.key === x.kind)?.label}{x.installmentNumber ? ` ${x.installmentNumber}` : ""}</span>
                        <span className="block text-xs text-zinc-500">
                          {day(x.receivedOn)}
                          {x.externalRef ? ` · ${x.externalRef}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 tabular-nums">
                        <span className={x.kind === "refund" ? "text-red-700" : ""}>{x.kind === "refund" ? "-" : ""}{formatMoney(x.amountCents)}</span>
                        {x.entryAmountCents !== null ? (
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                            comissão {formatMoney(x.entryAmountCents)} <ToneBadge list={COMMISSION_STATUSES} value={x.entryStatus!} />
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">sem comissão</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <ReceiptForm referralId={r.id} receipts={receipts.filter((x) => x.kind !== "refund").map((x) => ({ id: x.id, label: `${day(x.receivedOn)} · ${formatMoney(x.amountCents)}${Number(x.refundedCents) ? ` (já reembolsado ${formatMoney(Number(x.refundedCents))})` : ""}` }))} />
            </Panel>
          )}

          <Panel title="Histórico">
            <ol className="space-y-4">
              {data.events.map((e) => (
                <li key={e.id} className="text-[13px]">
                  <p className="flex items-center gap-2 font-medium text-zinc-900">
                    {e.toStatus ? `${e.fromStatus ? `${referralStatusLabel(e.fromStatus)} → ` : ""}${referralStatusLabel(e.toStatus as ReferralStatus)}` : "Mensagem"}
                    {!e.visibleToPartner && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-zinc-500">
                        <EyeOff className="size-3" aria-hidden="true" /> interno
                      </span>
                    )}
                  </p>
                  {e.note && <p className="mt-0.5 whitespace-pre-line text-zinc-700">{e.note}</p>}
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {e.actorType === "partner" ? `${e.partnerUserName ?? "Parceiro"} (parceiro)` : e.actorType === "cms" ? (e.userName ?? "Equipe") : "Sistema"} · {formatDateTime(e.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>

          {data.related.length > 0 && (
            <Panel title="Outras indicações da mesma empresa" description="Pelo domínio, CNPJ ou nome.">
              <ul className="-my-2 divide-y divide-zinc-100">
                {data.related.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                    <Link href={`/cms/alliance/indicacoes/${x.id}`} className="underline-offset-4 hover:underline">
                      <span className="font-mono text-xs text-zinc-500">{x.code}</span> {x.partnerName}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-zinc-500">
                      {formatDay(x.createdAt)} <ToneBadge list={REFERRAL_STATUSES} value={x.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <aside>
          <Panel title="Gerenciar">
            <ReferralManager
              id={r.id}
              version={r.version}
              status={r.status as ReferralStatus}
              ownerUserId={r.ownerUserId}
              dealValueCents={r.dealValueCents}
              lostReason={r.lostReason}
              internalNotes={r.internalNotes}
              partnerId={r.partnerId}
              owners={owners}
              partners={partners}
              canEdit={user.permissions.has("alliance.referrals")}
            />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 break-words text-zinc-900">{value}</dd>
    </div>
  );
}
