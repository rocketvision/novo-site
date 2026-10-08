import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { ReferralForm } from "@/components/hub/referral-form";
import { and, asc, eq, inArray } from "drizzle-orm";
import { partnerRoleLabel } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { getDb, schema } from "@/server/db";
import { isUuid } from "@/server/media/service";
import { partnerOptions } from "@/server/alliance/partners";
import { getProgramSettings } from "@/server/alliance/settings";

export const metadata: Metadata = { title: "Nova indicação · Rocket Alliance" };

/** A equipe registra uma indicação que chegou por outro canal (telefone, WhatsApp, reunião) em nome de um parceiro. */
export default async function CmsNewReferralPage({ searchParams }: { searchParams: Promise<{ parceiro?: string }> }) {
  await requirePermission("alliance.referrals", "/cms/alliance/indicacoes/nova");
  const { parceiro } = await searchParams;
  const [settings, partners] = await Promise.all([getProgramSettings(), partnerOptions()]);
  // Parceiros suspensos ou encerrados não recebem novas indicações.
  const eligible = partners.filter((p) => p.status === "active" || p.status === "onboarding");
  const people = eligible.length
    ? await getDb()
        .select({ id: schema.partnerUsers.id, partnerId: schema.partnerUsers.partnerId, name: schema.partnerUsers.name, role: schema.partnerUsers.role })
        .from(schema.partnerUsers)
        .where(and(inArray(schema.partnerUsers.partnerId, eligible.map((p) => p.id)), eq(schema.partnerUsers.status, "active")))
        .orderBy(asc(schema.partnerUsers.name))
    : [];
  const defaultPartnerId = isUuid(parceiro) && eligible.some((p) => p.id === parceiro) ? parceiro! : "";
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/cms/alliance/indicacoes" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Indicações
          </Link>
        }
        title="Nova indicação"
        description="Registre uma indicação que chegou por outro canal em nome da empresa parceira. Valem as mesmas regras de duplicidade e proteção do Alliance Hub."
      />
      <ReferralForm
        protectionDays={settings.protectionDays}
        partners={eligible.map(({ id, tradeName }) => ({ id, tradeName }))}
        people={people.map((p) => ({ id: p.id, partnerId: p.partnerId, name: p.name, roleLabel: partnerRoleLabel(p.role) }))}
        defaultPartnerId={defaultPartnerId}
      />
    </div>
  );
}
