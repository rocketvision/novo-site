import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { EMPTY_RULE, RuleActions, RuleForm } from "@/components/cms/alliance/commission-admin";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { formatDay } from "@/lib/cms/format";
import { MODALITIES, RULE_SCOPES, RULE_STATUSES, TIERS, type ModalityKey, type TierKey } from "@/lib/alliance/constants";
import { formatRate } from "@/lib/alliance/money";
import { requirePermission } from "@/server/authz/guard";
import { listRules } from "@/server/alliance/commissions";
import { partnerOptions } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Regras de comissão · Rocket Alliance" };

const day = (d: string) => formatDay(new Date(`${d}T12:00:00Z`));
const percent = (bp: number) => (bp / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");

export default async function RulesPage() {
  await requirePermission("alliance.finance", "/cms/alliance/comissoes/regras");
  const [rules, partners] = await Promise.all([listRules(), partnerOptions()]);
  return (
    <div>
      <PageHeader title="Regras de comissão" description="Nenhum percentual é fixo no sistema. Uma regra só calcula comissões depois da aprovação comercial e dentro da vigência; vale a mais específica (parceiro, depois nível e modalidade)." />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-3">
          {rules.length === 0 && <p className="text-sm text-zinc-500">Nenhuma regra cadastrada.</p>}
          {rules.map(({ rule: r, partnerName, approvedByName }) => (
            <article key={r.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">{r.name}</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {[partnerName ?? null, r.tierKey ? TIERS[r.tierKey as TierKey].name : "Todos os níveis", r.modalityKey ? MODALITIES[r.modalityKey as ModalityKey].name : "Todas as modalidades"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold tabular-nums">{formatRate(r.rateBp)}</span>
                  <ToneBadge list={RULE_STATUSES} value={r.status} />
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {RULE_SCOPES.find((s) => s.key === r.scope)?.label} · {r.recurringMonths} mensalidade(s) · vigência {day(r.validFrom)}
                {r.validTo ? ` a ${day(r.validTo)}` : " sem fim"}
                {r.isPublic ? " · aparece no site" : ""}
                {approvedByName ? ` · aprovada por ${approvedByName}` : ""}
              </p>
              {r.notes && <p className="mt-1 text-xs text-zinc-500">{r.notes}</p>}
              <div className="mt-3">
                <RuleActions
                  id={r.id}
                  status={r.status}
                  name={r.name}
                  partners={partners}
                  initial={{ name: r.name, partnerId: r.partnerId, tierKey: r.tierKey as TierKey | null, modalityKey: r.modalityKey as ModalityKey | null, scope: r.scope, ratePercent: percent(r.rateBp), recurringMonths: r.recurringMonths, validFrom: r.validFrom, validTo: r.validTo, isPublic: r.isPublic, notes: r.notes }}
                />
              </div>
            </article>
          ))}
        </div>
        <Panel title="Nova regra" description="Entra aguardando aprovação comercial.">
          <RuleForm id={null} initial={EMPTY_RULE} partners={partners} />
        </Panel>
      </div>
    </div>
  );
}
