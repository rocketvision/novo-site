"use client";

import { siteHref } from "@/lib/cms/site-link";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Archive, Copy, ExternalLink, Eye, Plus, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Select, Switch } from "@/components/cms/ui/field";
import { Badge, Panel } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { Fields } from "@/components/cms/content/fields";
import { MediaContext, type MediaPreview } from "@/components/cms/content/image-field";
import { MediaSlot } from "@/components/cms/content/media-slot";
import { setAt, type Path } from "@/components/cms/content/path";
import type { FieldSpec } from "@/components/cms/content/specs";
import { MediaPicker } from "@/components/cms/media/media-picker";
import { api, ApiError } from "@/lib/cms/api";
import { relativeTime } from "@/lib/cms/format";
import { contrastRatio, PROJECT_LIMITS, projectInputSchema, slugify, suggestTone, type ProjectInput } from "@/lib/validation/projects";
import { cn } from "@/lib/utils";

type Status = "draft" | "published" | "archived";

export type ProjectEditorProps = {
  id: string | null;
  initial: {
    data: ProjectInput;
    version: number;
    status: Status;
    hasChanges: boolean;
    publishedAt: string | null;
    publishedByName: string | null;
    publicSlug: string | null;
    isSample: boolean;
  };
  media: Record<string, MediaPreview>;
  perms: { canEdit: boolean; canCreate: boolean; canPublish: boolean; canArchive: boolean; canDelete: boolean; canUpload: boolean };
};

const INFO: FieldSpec[] = [
  { type: "text", key: "name", label: "Nome do projeto", max: 80 },
  { type: "text", key: "client", label: "Cliente", max: 80, optional: true, hint: "Só com autorização do cliente. Vazio: não aparece." },
  { type: "text", key: "category", label: "Categoria", max: 40, hint: "Ex.: Sistema de gestão, Aplicativo, Loja virtual." },
  { type: "text", key: "summary", label: "Resumo", max: 220, multiline: true, hint: "Aparece na vitrine e no topo da página do projeto." },
];

const CONTENT: FieldSpec[] = [
  { type: "text", key: "description", label: "Descrição", max: 2000, multiline: true, optional: true, hint: "Texto de abertura da página, em destaque." },
  { type: "text", key: "context", label: "Contexto", max: 1500, multiline: true, optional: true, hint: "O cenário e o problema antes do projeto." },
  { type: "text", key: "solution", label: "Solução", max: 1500, multiline: true, optional: true, hint: "O que foi construído e por quê." },
  {
    type: "text",
    key: "results",
    label: "Resultados",
    max: 1500,
    multiline: true,
    optional: true,
    hint: "Só resultados reais e verificáveis, com autorização do cliente. Vazio: o bloco não aparece.",
  },
  { type: "lines", key: "services", label: "Serviços", itemLabel: "Serviço", max: 40, min: 0, maxItems: PROJECT_LIMITS.services },
  { type: "lines", key: "highlights", label: "Destaques", itemLabel: "Destaque", max: 90, min: 0, maxItems: PROJECT_LIMITS.highlights, hint: "Funcionalidades ou entregas marcantes." },
];

const LINKS: FieldSpec[] = [
  { type: "text", key: "externalUrl", label: "Link do projeto no ar", max: 500, optional: true, hint: "Endereço completo com https://." },
  { type: "text", key: "seoTitle", label: "Título para buscadores", max: 70, optional: true, hint: "Vazio: usa o nome do projeto." },
  { type: "text", key: "seoDescription", label: "Descrição para buscadores", max: 170, multiline: true, optional: true, hint: "Vazio: usa o resumo." },
];

const STATUS_BADGE: Record<Status, { tone: "green" | "neutral" | "amber"; label: string }> = {
  published: { tone: "green", label: "Publicado" },
  draft: { tone: "neutral", label: "Rascunho" },
  archived: { tone: "amber", label: "Arquivado" },
};

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[issue.path.map(String).join(".") || "_"] ??= issue.message;
  return errors;
}

type Busy = null | "save" | "publish" | "preview" | "unpublish" | "archive" | "restore" | "duplicate" | "delete";
type Confirm = null | "publish" | "unpublish" | "archive" | "delete";

export function ProjectEditor({ id, initial, media: initialMedia, perms }: ProjectEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const creating = id === null;
  const readOnly = creating ? !perms.canCreate : !perms.canEdit;

  const [data, setData] = useState<ProjectInput>(initial.data);
  const [saved, setSaved] = useState<ProjectInput>(initial.data);
  const [version, setVersion] = useState(initial.version);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [conflict, setConflict] = useState(false);
  const [media, setMedia] = useState(initialMedia);
  const [slugTouched, setSlugTouched] = useState(!creating);
  const [galleryPicker, setGalleryPicker] = useState(false);
  const [phonePicker, setPhonePicker] = useState(false);

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(saved), [data, saved]);

  /** O erro de um campo some quando a pessoa mexe nele. */
  const clearErrors = useCallback((path: Path) => {
    const key = path.join(".");
    setErrors((e) => {
      const left = Object.fromEntries(Object.entries(e).filter(([k]) => k !== key && !k.startsWith(`${key}.`) && !key.startsWith(`${k}.`)));
      return Object.keys(left).length === Object.keys(e).length ? e : left;
    });
  }, []);
  const pending = dirty || initial.hasChanges || initial.status === "draft";

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = useCallback((path: Path, value: unknown) => {
    clearErrors(path);
    setData((d) => {
      const next = setAt(d, path, value);
      // Enquanto o endereço não for editado à mão, ele acompanha o nome.
      if (path[0] === "name" && !slugTouched) return { ...next, slug: slugify(String(value)) };
      return next;
    });
  }, [slugTouched, clearErrors]);
  const update = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => set([key], value);

  function handleError(e: unknown) {
    const err = e as ApiError;
    // Fecha a confirmação: o erro precisa ficar visível no formulário.
    setConfirm(null);
    if (err.status === 409 && err.code === "stale") return setConflict(true);
    if (Object.keys(err.fields).length) {
      setErrors(err.fields);
      return toast.error(err.message === "Revise os campos destacados." ? err.message : `${err.message} Revise os campos destacados.`);
    }
    toast.error(err.message);
  }

  async function run(kind: Exclude<Busy, null>, action: () => Promise<void>) {
    if (busy) return;
    setBusy(kind);
    try {
      await action();
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  }

  /** Salva se preciso. Devolve a versão atual ou null (validação falhou / criação redirecionou). */
  async function persist(): Promise<number | null> {
    const parsed = projectInputSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      toast.error("Revise os campos destacados.");
      return null;
    }
    setErrors({});
    if (creating) {
      const created = await api<{ id: string }>("/api/cms/projects", { body: { data: parsed.data } });
      setSaved(data);
      toast.success("Projeto criado como rascunho.");
      router.replace(`/cms/projetos/${created.id}`);
      return null;
    }
    if (!dirty) return version;
    const result = await api<{ version: number }>(`/api/cms/projects/${id}`, { method: "PUT", body: { version, data: parsed.data } });
    setData(parsed.data);
    setSaved(parsed.data);
    setVersion(result.version);
    return result.version;
  }

  const save = () =>
    run("save", async () => {
      const v = await persist();
      if (v !== null) {
        toast.success(initial.status === "published" ? "Alterações salvas. O site muda quando você publicar." : "Rascunho salvo.");
        router.refresh();
      }
    });

  const action = (kind: "publish" | "unpublish" | "archive" | "restore", message: string) =>
    run(kind, async () => {
      const v = kind === "publish" ? await persist() : version;
      if (v === null) return setConfirm(null);
      const result = await api<{ version: number }>(`/api/cms/projects/${id}/${kind}`, { body: { version: v } });
      // O editor não remonta (o que a pessoa digitar enquanto a página atualiza não se perde): só avança a versão.
      setVersion(result.version);
      setConfirm(null);
      toast.success(message);
      router.refresh();
    });

  const preview = () => {
    const tab = window.open("about:blank", "_blank");
    return run("preview", async () => {
      let v: number | null = null;
      try {
        v = await persist();
      } finally {
        if (v === null) tab?.close();
      }
      if (v === null) return;
      const url = `/api/cms/preview?path=${encodeURIComponent(`/projetos/${data.slug}`)}`;
      if (tab) tab.location.href = url;
    });
  };

  const duplicate = () =>
    run("duplicate", async () => {
      const copy = await api<{ id: string }>(`/api/cms/projects/${id}/duplicate`, { method: "POST" });
      toast.success("Cópia criada como rascunho.");
      router.push(`/cms/projetos/${copy.id}`);
    });

  const remove = () =>
    run("delete", async () => {
      await api(`/api/cms/projects/${id}`, { method: "DELETE", body: { version, confirmSlug } });
      toast.success("Projeto excluído.");
      router.replace("/cms/projetos?status=archived");
    });

  // Ctrl/Cmd + S salva.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!readOnly && (dirty || creating)) void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const form = { value: data, set, errors, readOnly };
  const errorCount = Object.keys(errors).length;
  const contrast = contrastRatio(data.brandColor.match(/^#[0-9a-f]{6}$/i) ? data.brandColor : "#000000", data.tone === "light" ? "#ffffff" : "#0a0a0b");
  const suggested = /^#[0-9a-f]{6}$/i.test(data.brandColor) ? suggestTone(data.brandColor.toLowerCase()) : data.tone;
  const status = STATUS_BADGE[initial.status];
  const archived = initial.status === "archived";

  return (
    <MediaContext.Provider value={{ media, remember: (m) => setMedia((all) => ({ ...all, [m.id]: m })), canUpload: perms.canUpload }}>
      {!creating && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-zinc-500">
          <Badge tone={status.tone}>{status.label}</Badge>
          {initial.isSample && <Badge tone="blue">Conceitual</Badge>}
          {initial.status === "published" && initial.publishedAt && (
            <span>
              Publicado {relativeTime(initial.publishedAt)}
              {initial.publishedByName && ` por ${initial.publishedByName}`}
            </span>
          )}
          {initial.status === "published" && initial.hasChanges && !dirty && <Badge tone="amber">Alterações não publicadas</Badge>}
          {dirty && <Badge tone="blue">Alterações não salvas</Badge>}
          {initial.publicSlug && (
            <a href={siteHref(`/projetos/${initial.publicSlug}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              /projetos/{initial.publicSlug} <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      {conflict && (
        <div role="alert" className="mb-5 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>Outra pessoa alterou este projeto enquanto você editava. Recarregue para ver a versão atual. As suas alterações não salvas serão perdidas.</p>
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </div>
      )}
      {archived && (
        <p className="mb-5 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-[13px] text-zinc-600">
          Projeto arquivado: fora do site e somente leitura até ser restaurado.
        </p>
      )}
      {errorCount > 0 && (
        <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {errorCount === 1 ? "Um campo precisa de revisão." : `${errorCount} campos precisam de revisão.`} Os campos estão destacados abaixo.
        </p>
      )}

      <div className="space-y-6">
        <Panel title="Informações">
          <div className="space-y-5">
            <Fields specs={INFO.slice(0, 1)} path={[]} form={{ ...form, readOnly: readOnly || archived }} />
            <Field label="Endereço" error={errors.slug} hint={initial.publicSlug && initial.publicSlug !== data.slug ? `O endereço publicado continua /projetos/${initial.publicSlug} até você publicar as alterações.` : "Letras minúsculas, números e hífens."}>
              {(p) => (
                <div className="flex items-stretch">
                  <span className="flex items-center rounded-l-md border border-r-0 border-zinc-300 bg-zinc-50 px-2.5 text-sm text-zinc-500">/projetos/</span>
                  <Input
                    {...p}
                    className="rounded-l-none"
                    value={data.slug}
                    readOnly={readOnly || archived}
                    maxLength={60}
                    onChange={(e) => {
                      setSlugTouched(true);
                      update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                    }}
                  />
                </div>
              )}
            </Field>
            <Fields specs={INFO.slice(1)} path={[]} form={{ ...form, readOnly: readOnly || archived }} />
            <Field label="Data de entrega" optional error={errors.projectDate} hint="No site aparece só o ano.">
              {(p) => <Input {...p} type="date" className="max-w-48" value={data.projectDate} readOnly={readOnly || archived} onChange={(e) => update("projectDate", e.target.value)} />}
            </Field>
            <Switch
              label="Destaque"
              description="Projetos em destaque aparecem primeiro na vitrine. Vale na hora para projetos publicados."
              checked={data.featured}
              disabled={readOnly || archived}
              onChange={(v) => update("featured", v)}
            />
          </div>
        </Panel>

        <Panel title="Conteúdo da página" description="Campos vazios não aparecem no site.">
          <Fields specs={CONTENT} path={[]} form={{ ...form, readOnly: readOnly || archived }} />
        </Panel>

        <Panel title="Aparência" description="A cor da marca aparece só na abertura do projeto e no cartão da vitrine.">
          <div className="grid gap-5 sm:grid-cols-2">
            <ColorField
              label="Cor da marca"
              value={data.brandColor}
              error={errors.brandColor}
              readOnly={readOnly || archived}
              onChange={(v) => {
                clearErrors(["brandColor"]);
                clearErrors(["tone"]);
                // Ao trocar a cor, o tom do texto acompanha o de maior contraste (pode ser ajustado depois).
                setData((d) => ({ ...d, brandColor: v, tone: /^#[0-9a-f]{6}$/i.test(v) ? suggestTone(v.toLowerCase()) : d.tone }));
              }}
            />
            <ColorField label="Cor de destaque" value={data.accentColor} error={errors.accentColor} readOnly={readOnly || archived} onChange={(v) => update("accentColor", v)} hint="Usada na categoria e nos marcadores." />
            <Field label="Texto sobre a cor da marca" error={errors.tone}>
              {(p) => (
                <Select {...p} value={data.tone} disabled={readOnly || archived} onChange={(e) => update("tone", e.target.value as "light" | "dark")}>
                  <option value="light">Claro (para cores escuras)</option>
                  <option value="dark">Escuro (para cores claras)</option>
                </Select>
              )}
            </Field>
          </div>
          <div
            className={cn("mt-5 rounded-lg p-6", data.tone === "light" ? "text-white" : "text-zinc-950")}
            style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(data.brandColor) ? data.brandColor : "#e4e4e7" }}
            aria-label="Prévia das cores"
          >
            <p className="text-xs font-medium tracking-wide uppercase" style={{ color: data.accentColor }}>
              {data.category || "Categoria"}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{data.name || "Nome do projeto"}</p>
            <p className={cn("mt-1 text-sm", data.tone === "light" ? "text-white/70" : "text-black/65")}>{data.summary || "Resumo do projeto."}</p>
          </div>
          {contrast < 4.5 && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-amber-700">
              Contraste baixo entre o texto e a cor da marca ({contrast.toFixed(1).replace(".", ",")}:1). O mínimo recomendado é 4,5:1.
              {suggested !== data.tone && !readOnly && !archived && (
                <Button variant="secondary" size="sm" onClick={() => update("tone", suggested)}>
                  Usar texto {suggested === "light" ? "claro" : "escuro"}
                </Button>
              )}
            </p>
          )}
        </Panel>

        <Panel title="Imagens" description="Envie prints e fotos pela biblioteca. As imagens aparecem inteiras, sem corte.">
          <div className="grid gap-5 sm:grid-cols-2">
            <MediaSlot label="Capa" value={data.coverMediaId} onChange={(v) => update("coverMediaId", v)} error={errors.coverMediaId} readOnly={readOnly || archived} hint="Usada quando o projeto não tem telas. Exigida para publicar se não houver telas." />
            <MediaSlot label="Tela de computador" optional value={data.desktopMediaId} onChange={(v) => update("desktopMediaId", v)} error={errors.desktopMediaId} readOnly={readOnly || archived} aspect="aspect-[16/10]" hint="Print em 16:10, exibido numa janela de navegador." />
          </div>

          <div className="mt-6">
            <p className="mb-1.5 text-[13px] font-medium text-zinc-900">
              Telas de celular <span className="ml-1 font-normal text-zinc-500">Até {PROJECT_LIMITS.phones}</span>
            </p>
            <ThumbList
              ids={data.phoneMediaIds}
              readOnly={readOnly || archived}
              onChange={(ids) => update("phoneMediaIds", ids)}
              aspect="aspect-[390/844] w-16"
              label="tela de celular"
            />
            {!readOnly && !archived && data.phoneMediaIds.length < PROJECT_LIMITS.phones && (
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => setPhonePicker(true)}>
                <Plus className="size-3.5" /> Adicionar tela de celular
              </Button>
            )}
            <p className="mt-1.5 text-[13px] text-zinc-500">Prints em 390×844, exibidos num aparelho.</p>
            {errors.phoneMediaIds && <p className="mt-1.5 text-[13px] text-red-600">{errors.phoneMediaIds}</p>}
          </div>

          <div className="mt-6">
            <p className="mb-1.5 text-[13px] font-medium text-zinc-900">
              Galeria <span className="ml-1 font-normal text-zinc-500">Opcional, até {PROJECT_LIMITS.gallery}</span>
            </p>
            <ol className="space-y-2">
              {data.gallery.map((item, i) => {
                const m = media[item.mediaId];
                return (
                  <li key={`${item.mediaId}-${i}`} className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white p-2.5">
                    <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded bg-zinc-100">
                      {m && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt="" className="absolute inset-0 size-full object-contain" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Field label={`Legenda da imagem ${i + 1}`} optional error={errors[`gallery.${i}.caption`]}>
                        {(p) => (
                          <Input {...p} value={item.caption} maxLength={160} readOnly={readOnly || archived} onChange={(e) => set(["gallery", i, "caption"], e.target.value)} />
                        )}
                      </Field>
                    </div>
                    {!readOnly && !archived && (
                      <div className="mt-6 flex shrink-0">
                        <IconBtn label={`Mover imagem ${i + 1} para cima`} disabled={i === 0} onClick={() => update("gallery", move(data.gallery, i, i - 1))}>
                          <ArrowUp className="size-3.5" />
                        </IconBtn>
                        <IconBtn label={`Mover imagem ${i + 1} para baixo`} disabled={i === data.gallery.length - 1} onClick={() => update("gallery", move(data.gallery, i, i + 1))}>
                          <ArrowDown className="size-3.5" />
                        </IconBtn>
                        <IconBtn label={`Remover imagem ${i + 1}`} onClick={() => update("gallery", data.gallery.filter((_, j) => j !== i))}>
                          <Trash2 className="size-3.5" />
                        </IconBtn>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {!readOnly && !archived && data.gallery.length < PROJECT_LIMITS.gallery && (
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => setGalleryPicker(true)}>
                <Plus className="size-3.5" /> Adicionar imagem à galeria
              </Button>
            )}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <MediaSlot label="Logo do cliente" optional value={data.logoMediaId} onChange={(v) => update("logoMediaId", v)} readOnly={readOnly || archived} hint="PNG com fundo transparente. Só com autorização." aspect="aspect-[3/1]" />
            <MediaSlot label="Imagem de compartilhamento" optional value={data.ogMediaId} onChange={(v) => update("ogMediaId", v)} readOnly={readOnly || archived} hint="1200×630 para redes sociais. Vazio: usa a capa." aspect="aspect-[1200/630]" />
          </div>
        </Panel>

        <Panel title="Links e buscadores">
          <Fields specs={LINKS} path={[]} form={{ ...form, readOnly: readOnly || archived }} />
          <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4" aria-label="Prévia no Google">
            <p className="text-xs text-zinc-500">Prévia no Google</p>
            <p className="mt-2 truncate text-[15px] text-[#1a0dab]">{data.seoTitle || `${data.name || "Nome do projeto"} | Projetos Rocket Vision`}</p>
            <p className="mt-0.5 truncate text-xs text-emerald-800">/projetos/{data.slug || "endereco"}</p>
            <p className="mt-1 line-clamp-2 text-[13px] text-zinc-600">{data.seoDescription || data.summary || "Resumo do projeto."}</p>
          </div>
        </Panel>

        {!creating && (perms.canArchive || perms.canDelete || perms.canCreate) && (
          <Panel title="Outras ações">
            <div className="flex flex-wrap gap-2">
              {perms.canCreate && (
                <Button variant="secondary" size="sm" onClick={duplicate} loading={busy === "duplicate"} disabled={busy !== null}>
                  <Copy className="size-3.5" /> Duplicar
                </Button>
              )}
              {perms.canPublish && initial.status === "published" && (
                <Button variant="secondary" size="sm" onClick={() => setConfirm("unpublish")} disabled={busy !== null}>
                  <Undo2 className="size-3.5" /> Despublicar
                </Button>
              )}
              {perms.canArchive && !archived && (
                <Button variant="secondary" size="sm" onClick={() => setConfirm("archive")} disabled={busy !== null}>
                  <Archive className="size-3.5" /> Arquivar
                </Button>
              )}
              {perms.canArchive && archived && (
                <Button variant="secondary" size="sm" onClick={() => action("restore", "Projeto restaurado como rascunho.")} loading={busy === "restore"} disabled={busy !== null}>
                  <RotateCcw className="size-3.5" /> Restaurar
                </Button>
              )}
              {perms.canDelete && archived && (
                <Button variant="secondary" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => setConfirm("delete")} disabled={busy !== null}>
                  <Trash2 className="size-3.5" /> Excluir definitivamente
                </Button>
              )}
            </div>
            {perms.canDelete && !archived && <p className="mt-3 text-[13px] text-zinc-500">Para excluir, arquive o projeto primeiro.</p>}
          </Panel>
        )}
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!creating && !archived && (
            <Button variant="secondary" size="sm" onClick={preview} loading={busy === "preview"} disabled={busy !== null && busy !== "preview"}>
              {busy !== "preview" && <Eye className="size-3.5" />} Pré-visualizar
            </Button>
          )}
          {!readOnly && !archived && (
            <Button variant={creating ? "primary" : "secondary"} size="sm" onClick={save} loading={busy === "save"} disabled={(!dirty && !creating) || (busy !== null && busy !== "save")}>
              {creating ? "Criar rascunho" : "Salvar"}
            </Button>
          )}
          {!creating && !archived && perms.canPublish && (
            <Button size="sm" onClick={() => setConfirm("publish")} disabled={!pending || busy !== null}>
              {initial.status === "published" ? "Publicar alterações" : "Publicar"}
            </Button>
          )}
        </div>
      </div>

      <MediaPicker
        open={phonePicker}
        onClose={() => setPhonePicker(false)}
        canUpload={perms.canUpload}
        title="Adicionar tela de celular"
        onPick={(m) => {
          setMedia((all) => ({ ...all, [m.id]: m }));
          update("phoneMediaIds", [...data.phoneMediaIds, m.id].slice(0, PROJECT_LIMITS.phones));
        }}
      />
      <MediaPicker
        open={galleryPicker}
        onClose={() => setGalleryPicker(false)}
        canUpload={perms.canUpload}
        title="Adicionar imagem à galeria"
        onPick={(m) => {
          setMedia((all) => ({ ...all, [m.id]: m }));
          update("gallery", [...data.gallery, { mediaId: m.id, caption: "" }]);
        }}
      />

      <ConfirmDialog
        open={confirm === "publish"}
        tone="primary"
        title={initial.status === "published" ? "Publicar as alterações?" : "Publicar o projeto?"}
        description={`O projeto fica disponível em /projetos/${data.slug} e na vitrine imediatamente.`}
        confirmLabel="Publicar"
        loading={busy === "publish"}
        onConfirm={() => action("publish", initial.status === "published" ? "Alterações publicadas." : "Projeto publicado.")}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "unpublish"}
        title="Despublicar o projeto?"
        description={`Ele sai da vitrine e /projetos/${initial.publicSlug} passa a mostrar "página não encontrada". O conteúdo continua salvo como rascunho.`}
        confirmLabel="Despublicar"
        loading={busy === "unpublish"}
        onConfirm={() => action("unpublish", "Projeto despublicado.")}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "archive"}
        title="Arquivar o projeto?"
        description={initial.status === "published" ? "Ele sai do site imediatamente e fica guardado nos arquivados." : "Ele fica guardado nos arquivados e pode ser restaurado depois."}
        confirmLabel="Arquivar"
        loading={busy === "archive"}
        onConfirm={() => action("archive", "Projeto arquivado.")}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Excluir definitivamente?"
        description="O projeto e a ordem das imagens são apagados. As imagens continuam na biblioteca. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={busy === "delete"}
        onConfirm={remove}
        onClose={() => {
          setConfirm(null);
          setConfirmSlug("");
        }}
      >
        <Field label={`Digite ${initial.data.slug} para confirmar`} error={errors.confirmSlug}>
          {(p) => <Input {...p} value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} autoComplete="off" />}
        </Field>
      </ConfirmDialog>
    </MediaContext.Provider>
  );
}

function move<T>(list: T[], from: number, to: number) {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30">
      {children}
    </button>
  );
}

function ThumbList({ ids, onChange, readOnly, aspect, label }: { ids: string[]; onChange: (ids: string[]) => void; readOnly: boolean; aspect: string; label: string }) {
  const { media } = useContext(MediaContext);
  if (ids.length === 0) return <p className="text-[13px] text-zinc-500">Nenhuma tela.</p>;
  return (
    <ol className="flex flex-wrap gap-3">
      {ids.map((mediaId, i) => (
        <li key={`${mediaId}-${i}`} className="flex flex-col items-center gap-1.5">
          <div className={cn("relative overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200", aspect)}>
            {media[mediaId] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media[mediaId].url} alt="" className="absolute inset-0 size-full object-cover" />
            )}
          </div>
          {!readOnly && (
            <div className="flex">
              <IconBtn label={`Mover ${label} ${i + 1} para a esquerda`} disabled={i === 0} onClick={() => onChange(move(ids, i, i - 1))}>
                <ArrowUp className="size-3.5 -rotate-90" />
              </IconBtn>
              <IconBtn label={`Remover ${label} ${i + 1}`} onClick={() => onChange(ids.filter((_, j) => j !== i))}>
                <X className="size-3.5" />
              </IconBtn>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function ColorField({ label, value, onChange, error, hint, readOnly }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; readOnly?: boolean }) {
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <div className="flex gap-2">
          <input
            type="color"
            aria-label={`${label}: seletor`}
            value={valid ? value.toLowerCase() : "#000000"}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-zinc-300 bg-white p-1 disabled:cursor-default"
          />
          <Input {...p} value={value} maxLength={7} readOnly={readOnly} onChange={(e) => onChange(e.target.value.trim())} className="font-mono" />
        </div>
      )}
    </Field>
  );
}
