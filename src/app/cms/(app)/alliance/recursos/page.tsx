import type { Metadata } from "next";
import { Badge, PageHeader, Panel } from "@/components/cms/ui/layout";
import { EMPTY_RESOURCE, ResourceEditor } from "@/components/cms/alliance/library-admin";
import { formatBytes } from "@/lib/cms/format";
import { RESOURCE_CATEGORIES, TIERS } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { listResources } from "@/server/alliance/library";
import { partnerOptions } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Materiais · Rocket Alliance" };

const tierFrom = (rank: number) => Object.values(TIERS).find((t) => t.rank === rank)?.name;

export default async function ResourcesPage() {
  await requirePermission("alliance.resources", "/cms/alliance/recursos");
  const [rows, partners] = await Promise.all([listResources(), partnerOptions()]);
  return (
    <div>
      <PageHeader title="Materiais" description="Biblioteca do Alliance Hub. Arquivos são privados: só baixa quem está logado no Hub e dentro do público escolhido." />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          {rows.length === 0 && <p className="text-sm text-zinc-500">Nenhum material ainda.</p>}
          {RESOURCE_CATEGORIES.map((cat) => {
            const items = rows.filter((r) => r.resource.category === cat.key);
            if (items.length === 0) return null;
            return (
              <section key={cat.key}>
                <h2 className="mb-2 text-sm font-semibold text-zinc-900">{cat.label}</h2>
                <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
                  {items.map(({ resource: r, filename, sizeBytes }) => (
                    <li key={r.id}>
                      <details className="group">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-zinc-900">{r.title}</span>
                            <span className="mt-0.5 block text-xs text-zinc-500">
                              {filename ? `${filename}${sizeBytes ? ` · ${formatBytes(sizeBytes)}` : ""}` : r.url}
                              {r.minTierRank > 1 ? ` · ${tierFrom(r.minTierRank)} ou acima` : ""}
                              {r.partnerIds.length ? ` · ${r.partnerIds.length} parceiro(s)` : ""}
                            </span>
                          </span>
                          <Badge tone={r.status === "published" ? "green" : "neutral"}>{r.status === "published" ? "Publicado" : "Rascunho"}</Badge>
                        </summary>
                        <div className="border-t border-zinc-100 px-4 py-4">
                          <ResourceEditor
                            id={r.id}
                            partners={partners}
                            initial={{ title: r.title, description: r.description, category: r.category, file: r.fileId && filename ? { id: r.fileId, filename, sizeBytes: sizeBytes ?? undefined } : null, url: r.url ?? "", status: r.status as "draft" | "published", sortOrder: r.sortOrder, minTierRank: r.minTierRank, modalities: r.modalities, partnerIds: r.partnerIds }}
                          />
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <Panel title="Novo material">
          <ResourceEditor id={null} initial={EMPTY_RESOURCE} partners={partners} />
        </Panel>
      </div>
    </div>
  );
}
