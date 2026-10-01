import type { Metadata } from "next";
import { ArrowUpRight, Download, FolderOpen } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { formatBytes } from "@/lib/cms/format";
import { RESOURCE_CATEGORIES } from "@/lib/alliance/constants";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { hubResources } from "@/server/alliance/library";

export const metadata: Metadata = { title: "Materiais" };

/** Biblioteca do parceiro: só o que o nível, as modalidades e a empresa permitem (filtrado no servidor). */
export default async function HubResourcesPage() {
  const { user } = await requireHubSession();
  const items = await hubResources(user);
  const groups = RESOURCE_CATEGORIES.map((c) => ({ ...c, items: items.filter((i) => i.category === c.key) })).filter((g) => g.items.length > 0);
  return (
    <div>
      <PageHeader title="Materiais" description="Materiais comerciais, identidade visual, documentos, apresentações e treinamentos para vender e entregar junto com a Rocket Vision." />
      {groups.length === 0 ? (
        <EmptyState icon={<FolderOpen className="size-8" />} title="Os materiais do programa aparecem aqui assim que forem publicados para a sua empresa." />
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`cat-${g.key}`}>
              <h2 id={`cat-${g.key}`} className="mb-3 text-sm font-semibold text-zinc-900">
                {g.label}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((r) => {
                  const href = r.hasFile ? `/api/alliance/hub/resources/${r.id}/file` : r.url!;
                  return (
                    <li key={r.id}>
                      <a href={href} {...(r.hasFile ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })} className="group flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300">
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium text-zinc-900">{r.title}</span>
                          {r.hasFile ? <Download className="size-4 shrink-0 text-zinc-400 group-hover:text-zinc-700" aria-hidden="true" /> : <ArrowUpRight className="size-4 shrink-0 text-zinc-400 group-hover:text-zinc-700" aria-hidden="true" />}
                        </span>
                        {r.description && <span className="mt-1.5 line-clamp-3 text-[13px] text-zinc-600">{r.description}</span>}
                        <span className="mt-auto pt-3 text-xs text-zinc-400">{r.hasFile ? `${r.filename} · ${formatBytes(r.sizeBytes ?? 0)}` : "Link externo"}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
