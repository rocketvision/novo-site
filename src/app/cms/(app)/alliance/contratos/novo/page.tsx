import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { ContractEditor } from "@/components/cms/alliance/library-admin";
import { requirePermission } from "@/server/authz/guard";
import { isUuid } from "@/server/media/service";
import { partnerOptions } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Novo contrato · Rocket Alliance" };

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ parceiro?: string }> }) {
  await requirePermission("alliance.contracts", "/cms/alliance/contratos/novo");
  const { parceiro } = await searchParams;
  const partners = await partnerOptions();
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/cms/alliance/contratos" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Contratos
          </Link>
        }
        title="Novo contrato"
        description="Começa como rascunho. Nada é enviado ao parceiro até você enviar para aceite."
      />
      <Panel>
        <ContractEditor id={null} partners={partners} initial={{ partnerId: isUuid(parceiro) ? parceiro! : "", title: "Termo de Parceria Rocket Alliance", kind: "partnership", startsOn: null, endsOn: null, terms: "", commercialTerms: "", file: null }} />
      </Panel>
    </div>
  );
}
