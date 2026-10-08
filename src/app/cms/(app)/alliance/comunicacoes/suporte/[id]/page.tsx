import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { TicketReplyForm } from "@/components/cms/alliance/library-admin";
import { formatDateTime } from "@/lib/cms/format";
import { TICKET_CATEGORIES, TICKET_STATUSES } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { isUuid } from "@/server/media/service";
import { getTicket } from "@/server/alliance/support";
import { teamWithPermission } from "@/server/alliance/overview";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Chamado · Rocket Alliance" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("alliance.communications", `/cms/alliance/comunicacoes/suporte/${id}`);
  if (!isUuid(id)) notFound();
  const data = await getTicket(id);
  if (!data) notFound();
  const t = data.ticket;
  const team = await teamWithPermission("alliance.communications");
  return (
    <div>
      <PageHeader
        back={
          <Link href="/cms/alliance/comunicacoes/suporte" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Suporte
          </Link>
        }
        title={t.subject}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{t.code}</span>
            <ToneBadge list={TICKET_STATUSES} value={t.status} />
            {data.partnerName} · {TICKET_CATEGORIES.find((c) => c.key === t.category)?.label}
            {data.openedBy ? ` · aberto por ${data.openedBy}` : ""}
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <ol className="space-y-3">
          {data.messages.map((m) => (
            <li key={m.id} className={cn("rounded-lg border p-4", m.authorType === "cms" ? "border-zinc-900/10 bg-zinc-50" : "border-zinc-200 bg-white")}>
              <p className="text-xs text-zinc-500">
                <span className="font-medium text-zinc-900">{m.authorType === "cms" ? `${m.userName ?? "Equipe"} (Rocket Vision)` : (m.partnerUserName ?? "Parceiro")}</span> · {formatDateTime(m.createdAt)}
              </p>
              <p className="mt-2 text-[13px] whitespace-pre-line text-zinc-800">{m.body}</p>
            </li>
          ))}
        </ol>
        <Panel>
          <TicketReplyForm id={t.id} status={t.status} assignedTo={t.assignedTo} team={team} />
        </Panel>
      </div>
    </div>
  );
}
