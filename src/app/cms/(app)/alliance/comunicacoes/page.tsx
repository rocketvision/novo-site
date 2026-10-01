import type { Metadata } from "next";
import { Badge, PageHeader, Panel } from "@/components/cms/ui/layout";
import { AnnouncementActions, AnnouncementEditor, EMPTY_ANNOUNCEMENT } from "@/components/cms/alliance/library-admin";
import { formatDateTime } from "@/lib/cms/format";
import { TIERS } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { listAnnouncements } from "@/server/alliance/library";
import { partnerOptions } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Comunicados · Rocket Alliance" };

const STATUS = { draft: { label: "Rascunho", tone: "neutral" }, published: { label: "Publicado", tone: "green" }, archived: { label: "Arquivado", tone: "neutral" } } as const;

export default async function AnnouncementsPage() {
  await requirePermission("alliance.communications", "/cms/alliance/comunicacoes");
  const [rows, partners] = await Promise.all([listAnnouncements(), partnerOptions()]);
  return (
    <div>
      <PageHeader title="Comunicados" description="Avisos para as empresas parceiras no Hub. Os marcados como importantes também vão por e-mail." />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-zinc-500">Nenhum comunicado ainda.</p>}
          {rows.map((a) => {
            const s = STATUS[a.status as keyof typeof STATUS] ?? STATUS.draft;
            return (
              <article key={a.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900">{a.title}</h2>
                  <span className="flex gap-1.5">
                    {a.important && <Badge tone="amber">Importante</Badge>}
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {a.publishedAt ? `Publicado em ${formatDateTime(a.publishedAt)}` : `Criado em ${formatDateTime(a.createdAt)}`}
                  {a.minTierRank > 1 ? ` · ${Object.values(TIERS).find((t) => t.rank === a.minTierRank)?.name} ou acima` : " · todos os níveis"}
                  {a.partnerIds.length ? ` · ${a.partnerIds.length} parceiro(s)` : ""}
                </p>
                <p className="mt-2 line-clamp-4 text-[13px] whitespace-pre-line text-zinc-700">{a.body}</p>
                <div className="mt-3">
                  <AnnouncementActions id={a.id} status={a.status} title={a.title} partners={partners} initial={{ title: a.title, body: a.body, important: a.important, minTierRank: a.minTierRank, modalities: a.modalities, partnerIds: a.partnerIds }} />
                </div>
              </article>
            );
          })}
        </div>
        <Panel title="Novo comunicado">
          <AnnouncementEditor id={null} initial={EMPTY_ANNOUNCEMENT} partners={partners} />
        </Panel>
      </div>
    </div>
  );
}
