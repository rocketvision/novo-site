import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { ReferralForm } from "@/components/hub/referral-form";
import { requirePermission } from "@/server/authz/guard";
import { partnerOptions } from "@/server/alliance/partners";
import { getProgramSettings } from "@/server/alliance/settings";

export const metadata: Metadata = { title: "Nova indicação · Rocket Alliance" };

/** A equipe registra uma indicação que chegou por outro canal (telefone, WhatsApp, reunião) em nome de um parceiro. */
export default async function CmsNewReferralPage() {
  await requirePermission("alliance.referrals", "/cms/alliance/indicacoes/nova");
  const [settings, partners] = await Promise.all([getProgramSettings(), partnerOptions()]);
  // Parceiros suspensos ou encerrados não recebem novas indicações.
  const eligible = partners.filter((p) => p.status === "active" || p.status === "onboarding");
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
      <ReferralForm protectionDays={settings.protectionDays} partners={eligible.map(({ id, tradeName }) => ({ id, tradeName }))} />
    </div>
  );
}
