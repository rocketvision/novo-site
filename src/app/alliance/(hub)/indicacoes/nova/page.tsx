import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { ReferralForm } from "@/components/hub/referral-form";
import { requireHubPermission } from "@/server/alliance/hub/guard";
import { getProgramSettings } from "@/server/alliance/settings";

export const metadata: Metadata = { title: "Nova indicação" };

export default async function NewReferralPage() {
  await requireHubPermission("referrals.create");
  const settings = await getProgramSettings();
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/alliance/indicacoes" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Referral Pipeline
          </Link>
        }
        title="Nova indicação"
        description="Conte quem é a empresa e o que ela precisa. A equipe Rocket Vision analisa e você acompanha cada etapa."
      />
      <ReferralForm protectionDays={settings.protectionDays} />
    </div>
  );
}
