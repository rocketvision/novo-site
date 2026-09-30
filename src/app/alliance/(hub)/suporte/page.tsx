import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LifeBuoy, Plus } from "lucide-react";
import { ButtonLink } from "@/components/cms/ui/button";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { relativeTime } from "@/lib/cms/format";
import { TICKET_CATEGORIES, TICKET_STATUSES } from "@/lib/alliance/constants";
import { requireHubPermission } from "@/server/alliance/hub/guard";
import { hubTickets } from "@/server/alliance/support";
import { getProgramSettings } from "@/server/alliance/settings";

export const metadata: Metadata = { title: "Support" };

export default async function HubSupportPage() {
  const { user } = await requireHubPermission("support.use");
  const [tickets, settings] = await Promise.all([hubTickets(user), getProgramSettings()]);
  return (
    <div>
      <PageHeader
        title="Support"
        description={`Fale com a equipe Rocket Vision. Os chamados da sua empresa ficam registrados aqui.${settings.supportEmail ? ` Também por ${settings.supportEmail}.` : ""}`}
        actions={
          <ButtonLink href="/alliance/suporte/novo" size="sm">
            <Plus className="size-4" /> Novo chamado
          </ButtonLink>
        }
      />
      {tickets.length === 0 ? (
        <EmptyState icon={<LifeBuoy className="size-8" />} title="Nenhum chamado ainda." />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {tickets.map((t) => (
            <li key={t.id} className="border-b border-zinc-100 last:border-0">
              <Link href={`/alliance/suporte/${t.id}`} className="group flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50">
                <span className="w-20 shrink-0 font-mono text-xs text-zinc-500">{t.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-900">{t.subject}</span>
                  <span className="block text-xs text-zinc-500">
                    {TICKET_CATEGORIES.find((c) => c.key === t.category)?.label} · {relativeTime(t.lastMessageAt)}
                  </span>
                </span>
                <ToneBadge list={TICKET_STATUSES} value={t.status} />
                <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
