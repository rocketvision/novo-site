import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LayoutTemplate } from "lucide-react";
import { Badge, EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { relativeTime } from "@/lib/cms/format";
import { requirePermission } from "@/server/authz/guard";
import { listPartners } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Páginas de parceiros · Rocket Alliance" };

/** Páginas exclusivas (/partners/[slug]): uma por parceiro, editadas em blocos. */
export default async function PartnerPagesPage() {
  await requirePermission("alliance.publish", "/cms/alliance/paginas");
  const partners = await listPartners();
  return (
    <div className="max-w-4xl">
      <PageHeader title="Páginas de parceiros" description="Cada parceiro tem uma página própria, montada em blocos. Nova empresa, nova página: nada de código." />
      <Link href="/cms/alliance/paginas/programa" className="group mb-6 flex items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3.5 hover:border-zinc-300">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-zinc-900">Página do programa</span>
          <span className="block truncate text-xs text-zinc-500">/partners · conceito, modelo comercial, diretório, FAQ e candidatura</span>
        </span>
        <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
      </Link>
      {partners.length === 0 ? (
        <EmptyState icon={<LayoutTemplate className="size-8" />} title="Nenhum parceiro ainda. A página nasce junto com o cadastro." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {partners.map((p) => (
              <li key={p.id}>
                <Link href={`/cms/alliance/parceiros/${p.id}/pagina`} className="group flex items-center gap-4 px-4 py-3 hover:bg-zinc-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">{p.tradeName}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      /partners/{p.slug} · alterado {relativeTime(p.updatedAt)}
                    </span>
                  </span>
                  {p.published ? <Badge tone="green">Publicada</Badge> : <Badge>Não publicada</Badge>}
                  {p.hasChanges && <Badge tone="amber">Alterações</Badge>}
                  <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
