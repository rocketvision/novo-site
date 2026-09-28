"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, ImageUp, LoaderCircle, Search, Upload } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/field";
import { EmptyState } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { cn } from "@/lib/utils";
import { MediaGrid } from "./media-grid";
import { MediaSheet } from "./media-sheet";
import { ACCEPT, type MediaDTO } from "./types";
import { useUpload, type UploadItem } from "./use-upload";

export type MediaFilter = "all" | "unused" | "no-alt";

const FILTERS: { value: MediaFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unused", label: "Sem uso" },
  { value: "no-alt", label: "Sem texto alternativo" },
];

export function MediaLibrary({
  initial,
  initialCursor,
  q,
  filter,
  perms,
  sectionSlugs,
}: {
  initial: MediaDTO[];
  initialCursor: string | null;
  q: string;
  filter: MediaFilter;
  perms: { canUpload: boolean; canEdit: boolean; canDelete: boolean };
  sectionSlugs: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState(q);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const onUploaded = useCallback(
    (media: MediaDTO, duplicate: boolean) => {
      setItems((list) => (list.some((m) => m.id === media.id) ? list : [{ ...media, usageCount: media.usageCount ?? 0 }, ...list]));
      if (duplicate) toast.success(`${media.filename} já estava na biblioteca.`);
      else router.refresh();
    },
    [toast, router],
  );
  const upload = useUpload(onUploaded);

  function navigate(next: { q?: string; filter?: MediaFilter }) {
    const params = new URLSearchParams();
    const nq = next.q ?? q;
    const nf = next.filter ?? filter;
    if (nq) params.set("q", nq);
    if (nf !== "all") params.set("filtro", nf);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ cursor, filter });
      if (q) params.set("q", q);
      const page = await api<{ items: MediaDTO[]; nextCursor: string | null }>(`/api/cms/media?${params}`);
      setItems((list) => [...list, ...page.items.filter((m) => !list.some((x) => x.id === m.id))]);
      setCursor(page.nextCursor);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setLoadingMore(false);
    }
  }

  const dropHandlers = perms.canUpload
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          dragDepth.current += 1;
          setDragging(true);
        },
        onDragLeave: () => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        },
        onDragOver: (e: React.DragEvent) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          if (e.dataTransfer.files.length) upload.add(e.dataTransfer.files);
        },
      }
    : {};

  const filtered = q !== "" || filter !== "all";

  return (
    <div {...dropHandlers} className="relative">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: query.trim() });
          }}
          className="relative w-full sm:max-w-xs"
        >
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            aria-label="Buscar por nome ou texto alternativo"
            placeholder="Buscar por nome ou texto alternativo"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value === "" && q !== "") navigate({ q: "" });
            }}
            className="pl-8"
            maxLength={100}
          />
        </form>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Filtro" className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => navigate({ filter: f.value })}
                className={cn(
                  "rounded px-2.5 py-1 text-[13px] whitespace-nowrap transition-colors",
                  filter === f.value ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {perms.canUpload && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  if (e.target.files?.length) upload.add(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button size="sm" onClick={() => fileInput.current?.click()} className="max-sm:hidden">
                <Upload className="size-4" /> Enviar imagens
              </Button>
            </>
          )}
        </div>
      </div>

      {perms.canUpload && (
        <Button size="sm" onClick={() => fileInput.current?.click()} className="mb-4 w-full sm:hidden">
          <Upload className="size-4" /> Enviar imagens
        </Button>
      )}

      {upload.items.length > 0 && <UploadQueue items={upload.items} onClear={upload.busy ? undefined : upload.clear} />}

      {items.length === 0 ? (
        filtered ? (
          <EmptyState title="Nenhuma imagem encontrada com esses filtros." action={<Button variant="secondary" size="sm" onClick={() => { setQuery(""); navigate({ q: "", filter: "all" }); }}>Limpar filtros</Button>} />
        ) : (
          <EmptyState
            icon={<ImageUp className="size-6" />}
            title={perms.canUpload ? "Nenhuma imagem na biblioteca. Envie a primeira ou arraste arquivos para cá." : "Nenhuma imagem na biblioteca."}
            action={
              perms.canUpload && (
                <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
                  Escolher arquivos
                </Button>
              )
            }
          />
        )
      ) : (
        <>
          <MediaGrid items={items} onSelect={(m) => setSelected(m.id)} label="Imagens da biblioteca" />
          {cursor && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" size="sm" onClick={loadMore} loading={loadingMore}>
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}

      {dragging && (
        <div aria-hidden="true" className="pointer-events-none absolute -inset-3 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-900 bg-white/85 backdrop-blur-[1px]">
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <Upload className="size-4" /> Solte para enviar
          </p>
        </div>
      )}

      <MediaSheet
        mediaId={selected}
        onClose={() => setSelected(null)}
        onChanged={(media) => setItems((list) => list.map((m) => (m.id === media.id ? { ...m, ...media } : m)))}
        onDeleted={(id) => {
          setItems((list) => list.filter((m) => m.id !== id));
          router.refresh();
        }}
        perms={perms}
        sectionSlugs={sectionSlugs}
      />
    </div>
  );
}

function UploadQueue({ items, onClear }: { items: UploadItem[]; onClear?: () => void }) {
  const pending = items.filter((i) => i.status === "queued" || i.status === "uploading").length;
  const failed = items.filter((i) => i.status === "error").length;
  const ok = items.length - pending - failed;
  const summary = [
    pending > 0 && `${pending} na fila`,
    ok > 0 && `${ok} ${ok === 1 ? "concluída" : "concluídas"}`,
    failed > 0 && `${failed} com erro`,
  ]
    .filter(Boolean)
    .join(", ");
  // Erros primeiro: são o que precisa de atenção.
  const ordered = [...items].sort((a, b) => Number(b.status === "error") - Number(a.status === "error"));

  return (
    <div className="mb-5 rounded-lg border border-zinc-200 bg-white" aria-live="polite">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2">
        <p className="text-[13px] text-zinc-900">
          <span className="font-medium">Envios</span>
          <span className={cn("ml-2", failed > 0 ? "text-red-600" : "text-zinc-500")}>{summary}</span>
        </p>
        {onClear && (
          <button type="button" onClick={onClear} className="text-xs text-zinc-500 hover:text-zinc-900">
            Limpar
          </button>
        )}
      </div>
      <ul className="max-h-60 divide-y divide-zinc-100 overflow-y-auto">
        {ordered.map((item) => (
          <li key={item.key} className="flex items-start gap-2.5 px-4 py-2 text-[13px]">
            {item.status === "uploading" || item.status === "queued" ? (
              <LoaderCircle aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0 text-zinc-400", item.status === "uploading" && "animate-spin")} />
            ) : item.status === "error" ? (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-600" />
            ) : (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-zinc-900">{item.name}</span>
              <span className={cn("block text-xs", item.status === "error" ? "text-red-600" : "text-zinc-500")}>
                {item.status === "queued" && "Na fila"}
                {item.status === "uploading" && "Enviando"}
                {item.status === "done" && "Enviada"}
                {item.status === "duplicate" && "Já estava na biblioteca"}
                {item.status === "error" && item.error}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
