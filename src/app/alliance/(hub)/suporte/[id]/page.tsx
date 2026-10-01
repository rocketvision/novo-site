import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { TicketReply } from "@/components/hub/ticket-forms";
import { formatDateTime } from "@/lib/cms/format";
import { TICKET_STATUSES } from "@/lib/alliance/constants";
import { requireHubPermission } from "@/server/alliance/hub/guard";
import { hubTicket } from "@/server/alliance/support";
import { isUuid } from "@/server/media/service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Chamado" };

export default async function HubTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireHubPermission("support.use");
  if (!isUuid(id)) notFound();
  const data = await hubTicket(user, id);
  if (!data) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/alliance/suporte" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Support
          </Link>
        }
        title={data.ticket.subject}
        description={
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-xs">{data.ticket.code}</span>
            <ToneBadge list={TICKET_STATUSES} value={data.ticket.status} />
          </span>
        }
      />
      <ol className="mb-6 space-y-3">
        {data.messages.map((m) => (
          <li key={m.id} className={cn("rounded-lg p-4 text-[13px]", m.authorType === "cms" ? "border border-sky-200 bg-sky-50/60" : "border border-zinc-200 bg-white")}>
            <p className="text-xs font-medium text-zinc-500">
              {m.authorType === "cms" ? "Equipe Rocket Vision" : (m.partnerUserName ?? "Sua empresa")} · {formatDateTime(m.createdAt)}
            </p>
            <p className="mt-2 whitespace-pre-line text-zinc-800">{m.body}</p>
          </li>
        ))}
      </ol>
      <TicketReply id={data.ticket.id} closed={data.ticket.status === "closed"} />
    </div>
  );
}
