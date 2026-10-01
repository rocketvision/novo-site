import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { Badge, EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { InterestButton } from "@/components/hub/interest-button";
import { formatDay } from "@/lib/cms/format";
import { hubCan, OPPORTUNITY_KINDS } from "@/lib/alliance/constants";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { hubOpportunities } from "@/server/alliance/library";

export const metadata: Metadata = { title: "Opportunities" };

const INTEREST: Record<string, { label: string; tone: "blue" | "green" | "neutral" }> = {
  sent: { label: "Interesse enviado", tone: "blue" },
  accepted: { label: "Interesse aceito", tone: "green" },
  declined: { label: "Não selecionada", tone: "neutral" },
};

export default async function HubOpportunitiesPage() {
  const { user } = await requireHubSession();
  const items = await hubOpportunities(user);
  const canInterest = hubCan(user.role, "opportunities.interest");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <PageHeader title="Opportunities" description="Projetos conjuntos, subcontratações e campanhas abertas para a sua empresa, conforme modalidade e nível." />
      {items.length === 0 ? (
        <EmptyState icon={<Lightbulb className="size-8" />} title="Nenhuma oportunidade aberta para a sua empresa agora. Avisamos quando surgir uma." />
      ) : (
        <ul className="space-y-4">
          {items.map((o) => (
            <li key={o.id} id={o.id} className="scroll-mt-20 rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <Badge tone="blue">{OPPORTUNITY_KINDS.find((k) => k.key === o.kind)?.label ?? o.kind}</Badge>
                {o.deadline && <span>Até {formatDay(new Date(`${o.deadline}T12:00:00Z`))}</span>}
              </div>
              <h2 className="mt-3 text-base font-semibold text-zinc-900">{o.title}</h2>
              <p className="mt-1 text-[13px] text-zinc-600">{o.summary}</p>
              {o.description && <p className="mt-3 text-[13px] whitespace-pre-line text-zinc-700">{o.description}</p>}
              <div className="mt-4">
                {o.interest ? (
                  <Badge tone={INTEREST[o.interest].tone}>{INTEREST[o.interest].label}</Badge>
                ) : canInterest && (!o.deadline || o.deadline >= today) ? (
                  <InterestButton id={o.id} title={o.title} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
