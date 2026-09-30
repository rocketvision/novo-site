import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/cms/ui/layout";
import { MarkRead } from "@/components/hub/mark-read";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { hubAnnouncements, hubNotifications } from "@/server/alliance/library";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Avisos" };

export default async function HubNoticesPage() {
  const { user } = await requireHubSession();
  const [notifications, announcements] = await Promise.all([hubNotifications(user, 100), hubAnnouncements(user)]);
  const unread = notifications.filter((n) => !n.readAt).length;
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <MarkRead unread={unread} />
      <div className="lg:col-span-3">
        <PageHeader title="Avisos" description="Tudo o que aconteceu com as suas indicações, comissões, pagamentos e a sua empresa." />
        {notifications.length === 0 ? (
          <EmptyState icon={<Bell className="size-8" />} title="Nenhum aviso ainda." />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {notifications.map((n) => (
              <li key={n.id} className={cn("border-b border-zinc-100 last:border-0", !n.readAt && "bg-sky-50/50")}>
                <Link href={n.link ?? "/alliance"} className="flex gap-3 px-4 py-3 hover:bg-zinc-50">
                  <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-[#2c9df5]")} />
                  <span className="min-w-0">
                    <span className="block text-sm text-zinc-900">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-[13px] text-zinc-600">{n.body}</span>}
                    <span className="mt-0.5 block text-xs text-zinc-500" title={formatDateTime(n.createdAt)}>
                      {relativeTime(n.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="lg:col-span-2 lg:pt-16">
        <Panel title="Comunicados do programa">
          {announcements.length === 0 ? (
            <p className="text-[13px] text-zinc-500">Nenhum comunicado.</p>
          ) : (
            <ul className="-my-2 divide-y divide-zinc-100">
              {announcements.map((a) => (
                <li key={a.id} id={a.id} className="scroll-mt-20 py-4">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900">
                    {a.title} {a.important && <Badge tone="amber">Importante</Badge>}
                  </p>
                  <p className="mt-1.5 text-[13px] whitespace-pre-line text-zinc-700">{a.body}</p>
                  {a.publishedAt && <p className="mt-1.5 text-xs text-zinc-500">{formatDateTime(a.publishedAt)}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
