import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { EMPTY_OPPORTUNITY, OpportunityEditor } from "@/components/cms/alliance/library-admin";
import { requirePermission } from "@/server/authz/guard";
import { partnerOptions } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Nova oportunidade · Rocket Alliance" };

export default async function NewOpportunityPage() {
  await requirePermission("alliance.resources", "/cms/alliance/recursos/oportunidades/nova");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nova oportunidade" description="Salve como rascunho ou abra direto: ao abrir, as empresas elegíveis recebem um aviso no Hub." />
      <Panel>
        <OpportunityEditor id={null} initial={EMPTY_OPPORTUNITY} partners={await partnerOptions()} />
      </Panel>
    </div>
  );
}
