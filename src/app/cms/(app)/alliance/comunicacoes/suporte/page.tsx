import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { relativeTime } from "@/lib/cms/format";
import { TICKET_CATEGORIES, TICKET_STATUSES, type TicketStatus } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { listTickets } from "@/server/alliance/support";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { isUuid } from "@/server/media/service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Suporte · Rocket Alliance" };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ status?: string; parceiro?: string }> }) {
  await requirePermission("alliance.communications", "/cms/alliance/comunicacoes/suporte");
  const { status: raw, parceiro } = await searchParams;
  const status = TICKET_STATUSES.some((s) => s.key === raw) ? (raw as TicketStatus) : undefined;
  const partnerId = isUuid(parceiro) ? parceiro : undefined;
  const [rows, partner] = await Promise.all([
    listTickets({ status, partnerId }),
    partnerId ? getDb().select({ tradeName: schema.partners.tradeName }).from(schema.partners).where(eq(schema.partners.id, partnerId)).then((r) => r[0] ?? null) : null,
  ]);
  const href = (s?: string) => {
    const u = new URLSearchParams(Object.entries({ status: s, parceiro: partnerId }).filter((e): e is [string, string] => Boolean(e[1])));
    return u.size ? `?${u}` : "?";
  };
  return (
    <div>
      <PageHeader title="Suporte" description="Chamados abertos pelas empresas no Alliance Hub." />
      <nav aria-label="Filtrar por situação" className="mb-4 flex flex-wrap gap-2">
        {[{ key: undefined, label: "Todos" }, ...TICKET_STATUSES].map((s) => (
          <Link key={s.label} href={href(s.key)} aria-current={status === s.key ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-[13px]", status === s.key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400")}>
            {s.label}
          </Link>
        ))}
      </nav>
      {partner && (
        <p className="mb-4 text-[13px] text-zinc-600">
          Só chamados de <strong className="font-medium text-zinc-900">{partner.tradeName}</strong>.{" "}
          <Link href={status ? `?status=${status}` : "?"} className="underline-offset-4 hover:underline">
            Ver de todos os parceiros
          </Link>
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={<LifeBuoy className="size-8" />} title="Nenhum chamado." />
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {rows.map((t) => (
            <li key={t.id}>
              <Link href={`/cms/alliance/comunicacoes/suporte/${t.id}`} className="grid gap-2 px-4 py-3.5 hover:bg-zinc-50 sm:grid-cols-[6rem_1fr_auto] sm:items-center sm:gap-4">
                <span className="font-mono text-xs text-zinc-500">{t.code}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-900">{t.subject}</span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">
                    {t.partnerName} · {TICKET_CATEGORIES.find((c) => c.key === t.category)?.label} · {relativeTime(t.lastMessageAt)}
                    {t.assignedName ? ` · ${t.assignedName}` : ""}
                  </span>
                </span>
                <ToneBadge list={TICKET_STATUSES} value={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
