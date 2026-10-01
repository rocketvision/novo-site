import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { PartnerTabs } from "@/components/cms/alliance/partner-tabs";
import { PARTNER_STATUSES, TIERS, type TierKey } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { getDb, schema } from "@/server/db";
import { isUuid } from "@/server/media/service";

/** Cabeçalho comum do parceiro: nome, situação, nível e as abas (cadastro, página, equipe). */
export default async function PartnerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("alliance.view", `/cms/alliance/parceiros/${id}`);
  if (!isUuid(id)) notFound();
  const [row] = await getDb().select({ tradeName: schema.partners.tradeName, status: schema.partners.status, tierKey: schema.partners.tierKey }).from(schema.partners).where(eq(schema.partners.id, id));
  if (!row) notFound();
  const tabs = [
    { href: `/cms/alliance/parceiros/${id}`, label: "Cadastro" },
    ...(user.permissions.has("alliance.publish") ? [{ href: `/cms/alliance/parceiros/${id}/pagina`, label: "Página exclusiva" }] : []),
    { href: `/cms/alliance/parceiros/${id}/equipe`, label: "Equipe no Hub" },
  ];
  return (
    <div className="max-w-4xl">
      <PageHeader
        back={
          <Link href="/cms/alliance/parceiros" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Parceiros
          </Link>
        }
        title={row.tradeName}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <ToneBadge list={PARTNER_STATUSES} value={row.status} />
            <span>{TIERS[row.tierKey as TierKey]?.name ?? row.tierKey}</span>
            <Link href={`/cms/alliance/indicacoes?parceiro=${id}`} className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              Indicações
            </Link>
            {user.permissions.has("alliance.finance") && (
              <Link href={`/cms/alliance/comissoes?parceiro=${id}`} className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
                Comissões
              </Link>
            )}
            {user.permissions.has("alliance.contracts") && (
              <Link href={`/cms/alliance/contratos?parceiro=${id}`} className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
                Contratos
              </Link>
            )}
          </span>
        }
      />
      <PartnerTabs tabs={tabs} />
      {children}
    </div>
  );
}
