import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { NewTicketForm } from "@/components/hub/ticket-forms";
import { requireHubPermission } from "@/server/alliance/hub/guard";

export const metadata: Metadata = { title: "Novo chamado" };

export default async function NewTicketPage() {
  await requireHubPermission("support.use");
  return (
    <div className="max-w-2xl">
      <PageHeader
        back={
          <Link href="/alliance/suporte" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Support
          </Link>
        }
        title="Novo chamado"
      />
      <NewTicketForm />
    </div>
  );
}
