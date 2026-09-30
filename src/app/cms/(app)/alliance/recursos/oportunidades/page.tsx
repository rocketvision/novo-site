import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonClass } from "@/components/cms/ui/button";
import { PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { formatDay } from "@/lib/cms/format";
import { OPPORTUNITY_KINDS, OPPORTUNITY_STATUSES } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { listOpportunities } from "@/server/alliance/library";

export const metadata: Metadata = { title: "Oportunidades · Rocket Alliance" };

export default async function OpportunitiesPage() {
  await requirePermission("alliance.resources", "/cms/alliance/recursos/oportunidades");
  const rows = await listOpportunities();
  return (
    <div>
      <PageHeader
        title="Oportunidades"
        description="Projetos conjuntos, subcontratações e ações de co-marketing oferecidas aos parceiros. Abertas, aparecem no Hub para o público escolhido."
        actions={
          <Link href="/cms/alliance/recursos/oportunidades/nova" className={buttonClass("primary", "md")}>
            <Plus className="size-4" aria-hidden="true" /> Nova oportunidade
          </Link>
        }
      />
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">Nenhuma oportunidade ainda.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {rows.map(({ opportunity: o, interests }) => (
            <li key={o.id}>
              <Link href={`/cms/alliance/recursos/oportunidades/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-50">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-900">{o.title}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {OPPORTUNITY_KINDS.find((k) => k.key === o.kind)?.label} · {interests} interessado(s)
                    {o.deadline ? ` · até ${formatDay(new Date(`${o.deadline}T12:00:00Z`))}` : ""}
                  </span>
                </span>
                <ToneBadge list={OPPORTUNITY_STATUSES} value={o.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
