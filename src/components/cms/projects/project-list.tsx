"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FolderKanban, Search, Star } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/field";
import { Badge, EmptyState } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { relativeTime } from "@/lib/cms/format";
import { cn } from "@/lib/utils";

export type ProjectRowDTO = {
  id: string;
  slug: string;
  name: string;
  client: string;
  category: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  isSample: boolean;
  brandColor: string;
  updatedAt: string;
  hasChanges: boolean;
  coverUrl: string | null;
};

const TABS = [
  { value: "", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Rascunhos" },
  { value: "archived", label: "Arquivados" },
] as const;

function StatusBadge({ row }: { row: ProjectRowDTO }) {
  if (row.status === "published") return row.hasChanges ? <Badge tone="amber">Publicado · alterações pendentes</Badge> : <Badge tone="green">Publicado</Badge>;
  if (row.status === "archived") return <Badge tone="neutral">Arquivado</Badge>;
  return <Badge tone="neutral">Rascunho</Badge>;
}

export function ProjectList({
  rows: initialRows,
  q,
  status,
  counts,
  perms,
}: {
  rows: ProjectRowDTO[];
  q: string;
  status: string;
  counts: { draft: number; published: number; archived: number };
  perms: { canEdit: boolean; canCreate: boolean };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState(q);
  const [busy, setBusy] = useState<string | null>(null);
  // Reordenar só faz sentido vendo a lista completa, na ordem da vitrine.
  const canReorder = perms.canEdit && q === "" && status === "";

  function navigate(next: { q?: string; status?: string }) {
    const params = new URLSearchParams();
    const nq = next.q ?? q;
    const ns = next.status ?? status;
    if (nq) params.set("q", nq);
    if (ns) params.set("status", ns);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  async function toggleFeatured(row: ProjectRowDTO) {
    if (busy) return;
    setBusy(row.id);
    try {
      await api(`/api/cms/projects/${row.id}/feature`, { body: { featured: !row.featured } });
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, featured: !r.featured } : r)));
      toast.success(row.featured ? "Destaque removido." : "Projeto em destaque.");
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  async function moveRow(index: number, to: number) {
    if (busy) return;
    // A ordem vale dentro de cada grupo (destaques primeiro); só troca com vizinhos do mesmo grupo.
    if (rows[to].featured !== rows[index].featured) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    setRows(next);
    setBusy("order");
    try {
      await api("/api/cms/projects/reorder", { body: { ids: next.map((r) => r.id) } });
    } catch (e) {
      setRows(rows);
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  const total = counts.draft + counts.published + counts.archived;
  const tabCount = (value: string) => (value === "" ? total : counts[value as keyof typeof counts]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Status" className="-mx-1 flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => navigate({ status: tab.value })}
              className={cn(
                "mx-1 border-b-2 px-1 pb-2 text-[13px] whitespace-nowrap transition-colors",
                status === tab.value ? "border-zinc-900 font-medium text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900",
              )}
            >
              {tab.label} <span className="text-zinc-400 tabular-nums">{tabCount(tab.value)}</span>
            </button>
          ))}
        </div>
        <form
          role="search"
          className="relative w-full sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: query.trim() });
          }}
        >
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            aria-label="Buscar projetos"
            placeholder="Buscar por nome, cliente ou categoria"
            value={query}
            maxLength={100}
            className="pl-8"
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value === "" && q !== "") navigate({ q: "" });
            }}
          />
        </form>
      </div>

      {rows.length === 0 ? (
        q || status ? (
          <EmptyState title="Nenhum projeto encontrado com esses filtros." action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); navigate({ q: "", status: "" }); }}>Limpar filtros</Button>} />
        ) : (
          <EmptyState
            icon={<FolderKanban className="size-6" />}
            title="Nenhum projeto ainda."
            action={perms.canCreate && <Link href="/cms/projetos/novo" className="text-[13px] font-medium text-zinc-900 underline underline-offset-4">Criar o primeiro projeto</Link>}
          />
        )
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {rows.map((row, i) => (
            <li key={row.id} className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
              {canReorder && (
                <div className="flex shrink-0 flex-col">
                  <button type="button" aria-label={`Mover ${row.name} para cima`} disabled={i === 0 || rows[i - 1].featured !== row.featured || busy !== null} onClick={() => moveRow(i, i - 1)} className="rounded p-0.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-25">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" aria-label={`Mover ${row.name} para baixo`} disabled={i === rows.length - 1 || rows[i + 1].featured !== row.featured || busy !== null} onClick={() => moveRow(i, i + 1)} className="rounded p-0.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-25">
                    <ArrowDown className="size-3.5" />
                  </button>
                </div>
              )}
              <Link href={`/cms/projetos/${row.id}`} className="group flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                <span className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded ring-1 ring-black/5" style={{ backgroundColor: row.brandColor }}>
                  {row.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-900 group-hover:underline group-hover:underline-offset-4">{row.name}</span>
                    {row.isSample && <Badge tone="blue">Exemplo</Badge>}
                  </span>
                  <span className="mt-1 block md:hidden">
                    <StatusBadge row={row} />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">
                    {row.category}
                    {row.client && ` · ${row.client}`} · /projetos/{row.slug}
                  </span>
                </span>
                <span className="hidden shrink-0 md:block">
                  <StatusBadge row={row} />
                </span>
                <span className="hidden w-28 shrink-0 text-right text-xs text-zinc-500 lg:block">{relativeTime(row.updatedAt)}</span>
              </Link>
              <button
                type="button"
                aria-label={row.featured ? `Remover destaque de ${row.name}` : `Destacar ${row.name}`}
                aria-pressed={row.featured}
                title={row.featured ? "Em destaque" : "Destacar"}
                disabled={!perms.canEdit || row.status === "archived" || busy !== null}
                onClick={() => toggleFeatured(row)}
                className="shrink-0 rounded p-1.5 text-zinc-300 hover:text-amber-500 disabled:pointer-events-none"
              >
                <Star className={cn("size-4", row.featured && "fill-amber-400 text-amber-500")} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {canReorder && rows.length > 1 && <p className="mt-3 text-[13px] text-zinc-500">A ordem da lista é a ordem da vitrine em /projetos. Projetos em destaque vêm primeiro.</p>}
    </>
  );
}
