import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { ReferralActions } from "@/components/hub/referral-actions";
import { formatDateTime, formatDay } from "@/lib/cms/format";
import { maskPhone } from "@/lib/diagnostic";
import { OPEN_REFERRAL_STATUSES, PARTNER_CANCELLABLE, REFERRAL_STATUSES, referralStatusLabel, type ReferralStatus } from "@/lib/alliance/constants";
import { formatTaxId } from "@/lib/alliance/identity";
import { formatMoney } from "@/lib/alliance/money";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { getReferralForHub } from "@/server/alliance/referrals";
import { isUuid } from "@/server/media/service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Indicação" };

const STAGES: ReferralStatus[] = ["submitted", "under_review", "qualified", "in_negotiation", "won"];

export default async function HubReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireHubSession();
  if (!isUuid(id)) notFound();
  const data = await getReferralForHub(user, id);
  if (!data) notFound();
  const { row: r, events } = data;
  const status = r.status as ReferralStatus;
  const closed = status === "lost" || status === "cancelled";
  const stageIndex = STAGES.indexOf(status);
  const protectedNow = OPEN_REFERRAL_STATUSES.includes(status) && r.protectedUntil > new Date();

  return (
    <div className="max-w-5xl">
      <PageHeader
        back={
          <Link href="/alliance/indicacoes" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Referral Pipeline
          </Link>
        }
        title={r.companyName}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{r.code}</span>
            <ToneBadge list={REFERRAL_STATUSES} value={r.status} />
            <span>Registrada em {formatDay(r.createdAt)}</span>
          </span>
        }
      />

      {!closed && (
        <ol aria-label="Etapas" className="mb-6 grid grid-cols-5 gap-1.5">
          {STAGES.map((s, i) => (
            <li key={s}>
              <span className={cn("block h-1.5 rounded-full", i <= stageIndex ? "bg-[#2c9df5]" : "bg-zinc-200")} />
              <span className={cn("mt-2 block truncate text-[11px] sm:text-xs", i === stageIndex ? "font-medium text-zinc-900" : "text-zinc-500")}>{referralStatusLabel(s)}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Panel title="Indicação">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Item label="Contato" value={`${r.contactName}${r.contactRole ? `, ${r.contactRole}` : ""}`} />
              <Item label="E-mail" value={r.contactEmail} />
              {r.contactPhone && <Item label="Telefone" value={maskPhone(r.contactPhone)} />}
              {r.companyWebsite && <Item label="Site" value={r.companyWebsite.replace(/^https:\/\//, "")} />}
              {r.companyTaxId && <Item label="CNPJ" value={formatTaxId(r.companyTaxId)} />}
              {r.city && <Item label="Cidade" value={r.city} />}
              {r.estimatedValueCents !== null && <Item label="Valor estimado" value={formatMoney(r.estimatedValueCents)} />}
              {r.dealValueCents !== null && status === "won" && <Item label="Valor do contrato" value={formatMoney(r.dealValueCents)} />}
            </dl>
            <div className="mt-5 border-t border-zinc-100 pt-5">
              <p className="text-xs text-zinc-500">Necessidade</p>
              <p className="mt-1 text-sm whitespace-pre-line text-zinc-800">{r.need}</p>
              {r.services.length > 0 && <p className="mt-3 text-xs text-zinc-500">Soluções: {r.services.join(", ")}</p>}
            </div>
            {status === "lost" && r.lostReason && <p className="mt-5 rounded-md bg-zinc-50 p-3 text-[13px] text-zinc-600">Motivo: {r.lostReason}</p>}
          </Panel>

          <Panel title="Histórico">
            <ol className="relative space-y-5 border-l border-zinc-200 pl-5">
              {events.map((e) => (
                <li key={e.id} className="relative text-[13px]">
                  <span aria-hidden="true" className={cn("absolute top-1 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-white", e.toStatus ? "bg-[#2c9df5]" : "bg-zinc-300")} />
                  {e.toStatus && <p className="font-medium text-zinc-900">{referralStatusLabel(e.toStatus)}</p>}
                  {e.note && <p className="mt-0.5 whitespace-pre-line text-zinc-700">{e.note}</p>}
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {e.actorType === "partner" ? (e.partnerName ?? "Sua empresa") : "Equipe Rocket Vision"} · {formatDateTime(e.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <aside className="space-y-6">
          {protectedNow && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-[13px] text-sky-900">
              <p className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-4" aria-hidden="true" /> Protegida
              </p>
              <p className="mt-1 text-sky-800/80">No nome da sua empresa até {formatDay(r.protectedUntil)}.</p>
            </div>
          )}
          <Panel title="Conversar">
            <ReferralActions id={r.id} canCancel={PARTNER_CANCELLABLE.includes(status)} />
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
