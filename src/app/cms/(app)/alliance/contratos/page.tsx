import type { Metadata } from "next";
import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { buttonClass } from "@/components/cms/ui/button";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { formatDay } from "@/lib/cms/format";
import { CONTRACT_KINDS, CONTRACT_STATUSES } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { isUuid } from "@/server/media/service";
import { listContracts } from "@/server/alliance/contracts";

export const metadata: Metadata = { title: "Contratos · Rocket Alliance" };

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ parceiro?: string }> }) {
  await requirePermission("alliance.contracts", "/cms/alliance/contratos");
  const { parceiro } = await searchParams;
  const rows = await listContracts({ partnerId: isUuid(parceiro) ? parceiro : undefined });
  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Termos de parceria, aditivos e acordos. Enviados, ficam congelados e o aceite no Hub registra pessoa, data, IP e o hash do texto."
        actions={
          <Link href="/cms/alliance/contratos/novo" className={buttonClass("primary", "md")}>
            <Plus className="size-4" aria-hidden="true" /> Novo contrato
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon={<FileSignature className="size-8" />} title="Nenhum contrato ainda." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {rows.map(({ contract: c, partnerName, acceptedByName }) => (
              <li key={c.id}>
                <Link href={`/cms/alliance/contratos/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {c.title} <span className="font-normal text-zinc-500">v{c.version}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {partnerName} · {CONTRACT_KINDS.find((k) => k.key === c.kind)?.label}
                      {c.acceptedAt ? ` · aceito por ${acceptedByName ?? c.acceptedName} em ${formatDay(c.acceptedAt)}` : ""}
                    </span>
                  </span>
                  <ToneBadge list={CONTRACT_STATUSES} value={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
