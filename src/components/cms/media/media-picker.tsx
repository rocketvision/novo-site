"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Upload, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/field";
import { EmptyState, Skeleton } from "@/components/cms/ui/layout";
import { api, ApiError } from "@/lib/cms/api";
import { MediaGrid } from "./media-grid";
import { ACCEPT, type MediaDTO } from "./types";
import { useUpload } from "./use-upload";

/**
 * Seletor de imagem da biblioteca, usado nos formulários de conteúdo e de projetos.
 * Permite buscar, enviar uma imagem nova sem sair do formulário e escolher uma.
 */
export function MediaPicker({
  open,
  onClose,
  onPick,
  canUpload,
  title = "Escolher imagem",
  endpoint = "/api/cms/media",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (media: MediaDTO) => void;
  canUpload: boolean;
  title?: string;
  /** Rota de listagem e envio. O Blog usa a própria, que mostra ao Colunista só as imagens dele. */
  endpoint?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaDTO[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [selected, setSelected] = useState<MediaDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const load = useCallback(async (q: string, after: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (after) params.set("cursor", after);
    return api<{ items: MediaDTO[]; nextCursor: string | null }>(`${endpoint}?${params}`);
  }, [endpoint]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    load(appliedQuery, null)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setError(null);
      })
      .catch((e: ApiError) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [open, appliedQuery, load]);

  const onUploaded = useCallback((media: MediaDTO) => {
    setItems((list) => [media, ...(list ?? []).filter((m) => m.id !== media.id)]);
    setSelected(media);
  }, []);
  const upload = useUpload(onUploaded, endpoint);
  const lastError = upload.items.find((i) => i.status === "error");

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await load(appliedQuery, cursor);
      setItems((list) => [...(list ?? []), ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoadingMore(false);
    }
  }

  function close() {
    setSelected(null);
    onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={close}
      aria-labelledby="picker-title"
      className="m-auto h-[min(44rem,calc(100dvh-2rem))] w-[min(56rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 id="picker-title" className="text-[15px] font-semibold">
            {title}
          </h2>
          <button type="button" onClick={close} aria-label="Fechar" className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-3 sm:flex-row sm:items-center">
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              setItems(null);
              setAppliedQuery(query.trim());
            }}
          >
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
            <Input type="search" aria-label="Buscar imagens" placeholder="Buscar por nome ou texto alternativo" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" maxLength={100} />
          </form>
          {canUpload && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  if (e.target.files?.length) upload.add(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button variant="secondary" size="sm" loading={upload.busy} onClick={() => fileInput.current?.click()}>
                {!upload.busy && <Upload className="size-4" />} Enviar nova
              </Button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {lastError && !upload.busy && (
            <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {lastError.name}: {lastError.error}
            </p>
          )}
          {error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {error}
            </p>
          ) : items === null ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/3]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState title={appliedQuery ? "Nenhuma imagem encontrada." : canUpload ? "A biblioteca está vazia. Envie a primeira imagem." : "A biblioteca está vazia."} />
          ) : (
            <>
              <MediaGrid items={items} selectedId={selected?.id ?? null} onSelect={setSelected} label="Imagens disponíveis" />
              {cursor && (
                <div className="mt-5 flex justify-center">
                  <Button variant="secondary" size="sm" onClick={loadMore} loading={loadingMore}>
                    Carregar mais
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
          <p className="min-w-0 truncate text-[13px] text-zinc-500">{selected ? `${selected.filename} · ${selected.width}×${selected.height}` : "Nenhuma imagem selecionada"}</p>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                onPick(selected);
                close();
              }}
            >
              Usar imagem
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
