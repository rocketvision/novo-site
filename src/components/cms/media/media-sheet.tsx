"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Textarea } from "@/components/cms/ui/field";
import { Skeleton } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { formatBytes, formatDateTime } from "@/lib/cms/format";
import { MediaThumb } from "./media-grid";
import { ACCEPT, precheck, usageHref, type MediaDetailDTO, type MediaDTO, type MediaUsageDTO } from "./types";

const FORMAT: Record<string, string> = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP" };

type Perms = { canEdit: boolean; canUpload: boolean; canDelete: boolean };

/**
 * Painel lateral com os detalhes de uma imagem: preview, texto alternativo, onde é usada,
 * substituir e remover. Abre sobre a biblioteca, com foco preso e Esc para fechar.
 */
export function MediaSheet({
  mediaId,
  onClose,
  onChanged,
  onDeleted,
  perms,
  sectionSlugs,
}: {
  mediaId: string | null;
  onClose: () => void;
  onChanged: (media: MediaDTO) => void;
  onDeleted: (id: string) => void;
  perms: Perms;
  sectionSlugs: Record<string, string>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<MediaDetailDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (mediaId && !dialog.open) dialog.showModal();
    if (!mediaId && dialog.open) dialog.close();
  }, [mediaId]);

  useEffect(() => {
    if (!mediaId) return;
    let cancelled = false;
    api<{ media: MediaDetailDTO }>(`/api/cms/media/${mediaId}`)
      .then(({ media }) => !cancelled && setDetail(media))
      .catch((e: ApiError) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
      setDetail(null);
      setLoadError(null);
    };
  }, [mediaId]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label="Detalhes da imagem"
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md border-l border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/30"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 className="text-sm font-semibold">Detalhes da imagem</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadError ? (
            <p role="alert" className="m-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {loadError}
            </p>
          ) : !detail ? (
            <div className="space-y-4 p-5">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <SheetBody
              key={detail.updatedAt}
              detail={detail}
              perms={perms}
              sectionSlugs={sectionSlugs}
              onChanged={(media) => {
                setDetail((d) => (d ? { ...d, ...media } : d));
                onChanged(media);
              }}
              onDeleted={(id) => {
                onDeleted(id);
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}

function SheetBody({
  detail,
  perms,
  sectionSlugs,
  onChanged,
  onDeleted,
}: {
  detail: MediaDetailDTO;
  perms: Perms;
  sectionSlugs: Record<string, string>;
  onChanged: (media: MediaDTO) => void;
  onDeleted: (id: string) => void;
}) {
  const toast = useToast();
  const [alt, setAlt] = useState(detail.alt);
  const [filename, setFilename] = useState(detail.filename);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blockedBy, setBlockedBy] = useState<MediaUsageDTO[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = alt.trim() !== detail.alt || filename.trim() !== detail.filename;
  const usages = blockedBy ?? detail.usages;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    setErrors({});
    try {
      const { media } = await api<{ media: MediaDTO }>(`/api/cms/media/${detail.id}`, {
        method: "PATCH",
        body: { alt, filename, expectedUpdatedAt: detail.updatedAt },
      });
      onChanged({ ...media, usageCount: detail.usageCount });
      toast.success("Dados da imagem salvos.");
    } catch (e) {
      const err = e as ApiError;
      if (Object.keys(err.fields).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function replace(file: File) {
    const problem = precheck(file);
    if (problem) return toast.error(problem);
    setReplacing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("expectedUpdatedAt", detail.updatedAt);
      const { media } = await api<{ media: MediaDTO }>(`/api/cms/media/${detail.id}/replace`, { formData: form });
      onChanged({ ...media, usageCount: detail.usageCount });
      toast.success(detail.usages.length > 0 ? "Arquivo substituído em todos os lugares onde a imagem é usada." : "Arquivo substituído.");
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setReplacing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api(`/api/cms/media/${detail.id}`, { method: "DELETE" });
      toast.success("Imagem removida.");
      setConfirmDelete(false);
      onDeleted(detail.id);
    } catch (e) {
      const err = e as ApiError;
      const inUse = (err.details as { usages?: MediaUsageDTO[] } | undefined)?.usages;
      if (inUse) setBlockedBy(inUse);
      toast.error(err.message);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 p-5">
      <a href={detail.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-zinc-200" title="Abrir o arquivo original">
        <MediaThumb media={detail} className="aspect-[4/3]" sizes="400px" />
      </a>

      <form onSubmit={save} noValidate className="space-y-4">
        <Field
          label="Texto alternativo"
          hint="Descreva o que aparece na imagem para quem usa leitor de tela. Deixe vazio só se a imagem for decorativa."
          error={errors.alt}
          counter={{ value: alt.length, max: 300 }}
        >
          {(p) => <Textarea {...p} rows={3} value={alt} onChange={(e) => setAlt(e.target.value)} readOnly={!perms.canEdit} />}
        </Field>
        <Field label="Nome" error={errors.filename}>
          {(p) => <Input {...p} value={filename} onChange={(e) => setFilename(e.target.value)} readOnly={!perms.canEdit} maxLength={120} />}
        </Field>
        {perms.canEdit && (
          <div className="flex items-center justify-end gap-3">
            {dirty && <span className="text-xs text-zinc-500">Alterações não salvas</span>}
            <Button type="submit" size="sm" loading={saving} disabled={!dirty}>
              Salvar
            </Button>
          </div>
        )}
      </form>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-zinc-100 pt-5 text-[13px]">
        <dt className="text-zinc-500">Dimensões</dt>
        <dd className="tabular-nums">
          {detail.width} × {detail.height} px
        </dd>
        <dt className="text-zinc-500">Tamanho</dt>
        <dd>{formatBytes(detail.sizeBytes)}</dd>
        <dt className="text-zinc-500">Formato</dt>
        <dd>{FORMAT[detail.mimeType] ?? detail.mimeType}</dd>
        <dt className="text-zinc-500">Enviada</dt>
        <dd>
          {formatDateTime(detail.createdAt)}
          {detail.uploadedByName && ` por ${detail.uploadedByName}`}
        </dd>
      </dl>

      <section aria-labelledby="usages-title" className="border-t border-zinc-100 pt-5">
        <h3 id="usages-title" className="text-[13px] font-semibold">
          Onde é usada
        </h3>
        {usages.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-zinc-500">Esta imagem não está em uso.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {usages.map((u) => {
              const href = usageHref(u, sectionSlugs);
              return (
                <li key={`${u.resourceType}-${u.resourceId}-${u.field}`} className="text-[13px]">
                  {href ? (
                    <Link href={href} className="group inline-flex items-center gap-1 text-zinc-800 underline-offset-4 hover:underline">
                      {u.label}
                      <ArrowUpRight aria-hidden="true" className="size-3.5 text-zinc-400 group-hover:text-zinc-700" />
                    </Link>
                  ) : (
                    <span className="text-zinc-800">{u.label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(perms.canEdit && perms.canUpload) || perms.canDelete ? (
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
          {perms.canEdit && perms.canUpload && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => e.target.files?.[0] && replace(e.target.files[0])}
              />
              <Button variant="secondary" size="sm" loading={replacing} onClick={() => fileInput.current?.click()}>
                {!replacing && <RefreshCw className="size-3.5" />} Substituir arquivo
              </Button>
            </>
          )}
          {perms.canDelete && (
            <Button variant="secondary" size="sm" className="text-red-700 hover:bg-red-50" disabled={usages.length > 0} onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" /> Remover
            </Button>
          )}
          {perms.canDelete && usages.length > 0 && (
            <p className="w-full text-xs text-zinc-500">Para remover, troque a imagem nos lugares acima.</p>
          )}
          {perms.canEdit && perms.canUpload && usages.length > 0 && (
            <p className="w-full text-xs text-zinc-500">Ao substituir o arquivo, a troca vale em todos os lugares acima, inclusive no site publicado.</p>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="Remover esta imagem?"
        description="O arquivo será apagado do armazenamento. Esta ação não pode ser desfeita."
        confirmLabel="Remover imagem"
        loading={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
