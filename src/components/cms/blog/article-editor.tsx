"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Circle, ExternalLink, Eye, History, ImageIcon, MessageSquare, PenLine, RotateCcw, Trash2, X } from "lucide-react";
import { ArticleBody } from "@/components/blog/article-body";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/cms/ui/field";
import { Badge, Panel } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { MediaPicker } from "@/components/cms/media/media-picker";
import type { MediaPreview } from "@/components/cms/content/image-field";
import { api, ApiError } from "@/lib/cms/api";
import { siteHref } from "@/lib/cms/site-link";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { documentStats, parseDocument } from "@/lib/blog/document";
import { STATUS_LABELS, STATUS_TONE, TRANSITIONS, type BlogAction, type BlogStatus } from "@/lib/blog/workflow";
import { articleInputSchema, type ArticleInput } from "@/lib/validation/blog";
import { slugify } from "@/lib/validation/projects";
import { cn } from "@/lib/utils";
import { RichEditor } from "./rich-editor";

export type CommentDTO = { id: string; kind: "comment" | "changes_requested"; body: string; createdAt: string; resolvedAt: string | null; authorName: string | null };
export type RevisionDTO = { id: string; number: number; reason: string; createdAt: string; authorName: string | null };

export type ArticleEditorProps = {
  id: string | null;
  initial: {
    data: ArticleInput;
    version: number;
    status: BlogStatus;
    hasChanges: boolean;
    publishedSlug: string | null;
    scheduledAt: string | null;
    updatedAt: string | null;
  };
  canEdit: boolean;
  actions: BlogAction[];
  categories: { id: string; name: string }[];
  /** Só para quem edita artigos de qualquer autor. Os demais assinam como eles mesmos. */
  authors: { id: string; name: string; affiliation: "team" | "guest" }[] | null;
  media: Record<string, MediaPreview>;
  perms: { canUpload: boolean; canFeature: boolean; canDelete: boolean; canComment: boolean };
  comments: CommentDTO[];
  revisions: RevisionDTO[];
  revisionReasons: Record<string, string>;
};

const MEDIA_ENDPOINT = "/api/cms/blog/media";

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[issue.path.map(String).join(".") || "_"] ??= issue.message;
  return errors;
}

/** Valor para <input type="datetime-local"> no fuso do navegador. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Busy = null | "save" | "preview" | BlogAction | "delete" | "comment" | "restore";
type Dialog = null | "publish" | "unpublish" | "archive" | "request_changes" | "schedule" | "delete" | { restore: RevisionDTO };
type Draft = { version: number; savedAt: number; data: ArticleInput };

export function ArticleEditor({ id, initial, canEdit, actions, categories, authors, media: initialMedia, perms, comments, revisions, revisionReasons }: ArticleEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const creating = id === null;
  const readOnly = !canEdit;

  const [data, setData] = useState<ArticleInput>(initial.data);
  const [saved, setSaved] = useState<ArticleInput>(initial.data);
  const [version, setVersion] = useState(initial.version);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [conflict, setConflict] = useState(false);
  const [media, setMedia] = useState(initialMedia);
  const [slugTouched, setSlugTouched] = useState(!creating);
  const [coverPicker, setCoverPicker] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [comment, setComment] = useState("");
  const [newComment, setNewComment] = useState("");
  const [scheduleAt, setScheduleAt] = useState(() => toLocalInput(initial.scheduledAt ? new Date(initial.scheduledAt) : new Date(Date.now() + 24 * 3600 * 1000)));
  const [confirmSlug, setConfirmSlug] = useState("");
  const [recovery, setRecovery] = useState<Draft | null>(null);
  const [minSchedule] = useState(() => toLocalInput(new Date(Date.now() + 5 * 60_000)));

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(saved), [data, saved]);
  const stats = useMemo(() => documentStats(data.content), [data.content]);
  const draftKey = `rv-blog-draft:${id ?? "novo"}`;

  // Volta da página com alterações não salvas: o navegador pede confirmação.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Recuperação: uma cópia local mais nova que a do servidor (aba fechada, queda de conexão).
  // Lida depois da montagem (o servidor não tem acesso ao armazenamento do navegador).
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (!raw) return;
        const draft = JSON.parse(raw) as Draft;
        const serverTime = initial.updatedAt ? new Date(initial.updatedAt).getTime() : 0;
        if (draft.version === initial.version && draft.savedAt > serverTime && JSON.stringify(draft.data) !== JSON.stringify(initial.data)) setRecovery(draft);
        else localStorage.removeItem(draftKey);
      } catch {
        /* armazenamento indisponível: segue sem recuperação */
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [draftKey, initial.version, initial.updatedAt, initial.data]);

  // Cópia local a cada 5 s enquanto houver alterações não salvas.
  const latest = useRef({ data, version, dirty });
  useEffect(() => {
    latest.current = { data, version, dirty };
  });
  useEffect(() => {
    if (readOnly) return;
    const timer = setInterval(() => {
      const { data: d, version: v, dirty: isDirty } = latest.current;
      if (!isDirty) return;
      try {
        localStorage.setItem(draftKey, JSON.stringify({ version: v, savedAt: Date.now(), data: d } satisfies Draft));
      } catch {
        /* cota cheia ou modo privado */
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [draftKey, readOnly]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* nada a limpar */
    }
  }, [draftKey]);

  function update<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setErrors((e) => (e[key] ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
    setData((d) => {
      const next = { ...d, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(String(value)).slice(0, 90);
      return next;
    });
  }

  function handleError(e: unknown) {
    const err = e as ApiError;
    setDialog(null);
    if (err.status === 409 && err.code === "stale") return setConflict(true);
    if (Object.keys(err.fields ?? {}).length) {
      setErrors(err.fields);
      return toast.error(err.message === "Revise os campos destacados." ? err.message : `${err.message} ${Object.values(err.fields)[0] ?? ""}`.trim());
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

  /** Salva se preciso. Devolve a versão atual, ou null quando a validação falhou ou a criação redirecionou. */
  async function persist(): Promise<number | null> {
    if (readOnly) return version;
    const parsed = articleInputSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      toast.error(parsed.error.issues[0]?.message ?? "Revise os campos destacados.");
      return null;
    }
    setErrors({});
    if (creating) {
      const created = await api<{ id: string }>("/api/cms/blog/articles", { body: { data: parsed.data } });
      setSaved(data);
      clearDraft();
      toast.success("Rascunho criado.");
      router.replace(`/cms/blog/${created.id}`);
      return null;
    }
    if (!dirty) return version;
    const result = await api<{ version: number }>(`/api/cms/blog/articles/${id}`, { method: "PUT", body: { version, data: parsed.data } });
    setSaved(data);
    setVersion(result.version);
    clearDraft();
    return result.version;
  }

  const save = () =>
    run("save", async () => {
      const v = await persist();
      if (v !== null) {
        toast.success(initial.status === "published" ? "Alterações salvas. O site muda quando o artigo for publicado de novo." : "Rascunho salvo.");
        router.refresh();
      }
    });
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  // Ctrl+S fora do editor de texto também salva.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!readOnly) saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly]);

  const transition = (action: BlogAction, extra: { comment?: string; scheduledAt?: string } = {}) =>
    run(action, async () => {
      const v = await persist();
      if (v === null) return setDialog(null);
      const result = await api<{ version: number }>(`/api/cms/blog/articles/${id}/actions`, { body: { action, version: v, ...extra } });
      setVersion(result.version);
      setDialog(null);
      setComment("");
      toast.success(TRANSITIONS[action].done);
      router.refresh();
    });

  const preview = () => {
    const win = window.open("about:blank", "_blank");
    return run("preview", async () => {
      let v: number | null = null;
      try {
        v = await persist();
      } finally {
        if (v === null) win?.close();
      }
      if (v === null) return;
      if (win) win.location.href = `/api/cms/preview?path=${encodeURIComponent(`/blog/${data.slug}`)}`;
    });
  };

  const remove = () =>
    run("delete", async () => {
      await api(`/api/cms/blog/articles/${id}`, { method: "DELETE", body: { version, confirmSlug } });
      setSaved(data);
      clearDraft();
      toast.success("Artigo excluído.");
      router.replace("/cms/blog");
    });

  const addComment = () =>
    run("comment", async () => {
      await api(`/api/cms/blog/articles/${id}/comments`, { body: { body: newComment } });
      setNewComment("");
      toast.success("Comentário adicionado.");
      router.refresh();
    });

  const toggleResolved = (c: CommentDTO) =>
    run("comment", async () => {
      await api(`/api/cms/blog/articles/${id}/comments/${c.id}`, { method: "PATCH", body: { resolved: !c.resolvedAt } });
      router.refresh();
    });

  const restore = (rev: RevisionDTO) =>
    run("restore", async () => {
      const v = await persist();
      if (v === null) return setDialog(null);
      const result = await api<{ version: number }>(`/api/cms/blog/articles/${id}/revisions/${rev.id}`, { body: { version: v } });
      const fresh = await api<{ data: ArticleInput; version: number }>(`/api/cms/blog/articles/${id}`);
      setData(fresh.data);
      setSaved(fresh.data);
      setVersion(result.version);
      setDialog(null);
      toast.success(`Revisão ${rev.number} restaurada. O histórico continua completo.`);
      router.refresh();
    });

  const previewDoc = useMemo(() => (tab === "preview" ? parseDocument(data.content) : null), [tab, data.content]);
  const cover = data.coverMediaId ? media[data.coverMediaId] : undefined;
  const errorCount = Object.keys(errors).length;
  const openComments = comments.filter((c) => !c.resolvedAt);
  const flowActions = actions.filter((a) => a !== "archive" && a !== "restore");

  return (
    <div>
      {!creating && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-zinc-500">
          <Badge tone={STATUS_TONE[initial.status]}>{STATUS_LABELS[initial.status]}</Badge>
          {initial.status === "scheduled" && initial.scheduledAt && <span>Entra no ar em {formatDateTime(initial.scheduledAt)}</span>}
          {initial.status === "published" && initial.hasChanges && !dirty && <Badge tone="amber">Alterações não publicadas</Badge>}
          {dirty && <Badge tone="blue">Alterações não salvas</Badge>}
          {initial.updatedAt && !dirty && <span>Salvo {relativeTime(initial.updatedAt)}</span>}
          {initial.publishedSlug && (
            <a href={siteHref(`/blog/${initial.publishedSlug}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              /blog/{initial.publishedSlug} <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      {recovery && (
        <div role="status" className="mb-5 flex flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-[13px] text-sky-900 sm:flex-row sm:items-center sm:justify-between">
          <p>Há alterações deste artigo guardadas neste navegador ({relativeTime(new Date(recovery.savedAt))}) que não chegaram a ser salvas.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => (setData(recovery.data), setRecovery(null))}>
              Recuperar alterações
            </Button>
            <Button size="sm" variant="ghost" onClick={() => (clearDraft(), setRecovery(null))}>
              Descartar
            </Button>
          </div>
        </div>
      )}
      {conflict && (
        <div role="alert" className="mb-5 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>Outra pessoa alterou este artigo enquanto você editava. Recarregue para ver a versão atual. Copie antes o trecho que você não quer perder.</p>
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </div>
      )}
      {readOnly && !creating && (
        <p className="mb-5 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-[13px] text-zinc-600">
          {initial.status === "archived"
            ? "Artigo arquivado: fora do site e somente leitura até ser restaurado."
            : "Somente leitura. Depois de aprovado, só quem edita artigos de qualquer autor pode alterar o texto."}
        </p>
      )}
      {errorCount > 0 && (
        <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {errorCount === 1 ? "Um campo precisa de revisão." : `${errorCount} campos precisam de revisão.`} {Object.values(errors)[0]}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Texto */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 sm:px-8">
            <label htmlFor="article-title" className="sr-only">
              Título
            </label>
            <textarea
              id="article-title"
              value={data.title}
              readOnly={readOnly}
              maxLength={140}
              rows={2}
              placeholder="Título do artigo"
              aria-invalid={errors.title ? true : undefined}
              onChange={(e) => update("title", e.target.value.replace(/\n/g, " "))}
              className="w-full resize-none border-0 bg-transparent p-0 text-2xl leading-tight font-semibold tracking-tight text-zinc-900 placeholder:text-zinc-300 focus:ring-0 focus:outline-none sm:text-3xl"
            />
            {errors.title && <p className="mt-1 text-[13px] text-red-600">{errors.title}</p>}
            <label htmlFor="article-subtitle" className="sr-only">
              Subtítulo
            </label>
            <textarea
              id="article-subtitle"
              value={data.subtitle}
              readOnly={readOnly}
              maxLength={220}
              rows={2}
              placeholder="Subtítulo (opcional)"
              onChange={(e) => update("subtitle", e.target.value.replace(/\n/g, " "))}
              className="mt-2 w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-zinc-600 placeholder:text-zinc-300 focus:ring-0 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div role="tablist" aria-label="Modo" className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 text-[13px]">
              {(["write", "preview"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-medium", tab === t ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900")}
                >
                  {t === "write" ? <PenLine className="size-3.5" /> : <Eye className="size-3.5" />}
                  {t === "write" ? "Escrever" : "Pré-visualizar"}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-zinc-500 tabular-nums" aria-live="polite">
              {stats.words} {stats.words === 1 ? "palavra" : "palavras"} · {stats.minutes} min de leitura
            </p>
          </div>

          {errors.content && (
            <p role="alert" className="text-[13px] text-red-600">
              {errors.content}
            </p>
          )}

          <div hidden={tab !== "write"}>
            <RichEditor value={data.content} onChange={(doc) => update("content", doc)} readOnly={readOnly} canUpload={perms.canUpload} mediaEndpoint={MEDIA_ENDPOINT} onSaveShortcut={() => saveRef.current()} />
          </div>
          {tab === "preview" && (
            <div className="rounded-lg border border-zinc-200 bg-white px-5 py-8 sm:px-10">
              {previewDoc && !previewDoc.ok ? (
                <p role="alert" className="text-[13px] text-red-600">
                  {previewDoc.error}
                </p>
              ) : previewDoc?.ok ? (
                <article className="mx-auto max-w-[68ch]">
                  <h1 className="font-serif text-4xl leading-tight text-zinc-950">{data.title || "Sem título"}</h1>
                  {data.subtitle && <p className="mt-3 text-lg text-zinc-600">{data.subtitle}</p>}
                  <div className="mt-8">
                    <ArticleBody document={previewDoc.document} />
                  </div>
                </article>
              ) : null}
            </div>
          )}
        </div>

        {/* Metadados */}
        <aside className="space-y-4" aria-label="Detalhes do artigo">
          <Panel title="Publicação">
            <div className="space-y-4">
              <Field label="Categoria" error={errors.categoryId}>
                {(p) => (
                  <Select {...p} value={data.categoryId ?? ""} disabled={readOnly} onChange={(e) => update("categoryId", e.target.value || null)}>
                    <option value="">Escolha</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {authors && (
                <Field label="Autor" error={errors.authorId} hint="Convidados aparecem como colunista convidado, nunca como equipe.">
                  {(p) => (
                    <Select {...p} value={data.authorId ?? ""} disabled={readOnly} onChange={(e) => update("authorId", e.target.value || null)}>
                      <option value="">Eu</option>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {a.affiliation === "guest" ? " (convidado)" : ""}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
              {perms.canFeature && (
                <Switch label="Destaque" description="Aparece no topo do Blog." checked={data.featured} disabled={readOnly} onChange={(v) => update("featured", v)} />
              )}
            </div>
          </Panel>

          <Panel title="Capa">
            <div className="space-y-3">
              <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200">
                {cover ? (
                  <Image src={cover.url} alt="" fill sizes="320px" className="object-cover" {...(cover.blurDataUrl && { placeholder: "blur" as const, blurDataURL: cover.blurDataUrl })} />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-400">
                    <ImageIcon className="size-6" aria-hidden="true" />
                  </div>
                )}
              </div>
              {errors.coverMediaId && <p className="text-[13px] text-red-600">{errors.coverMediaId}</p>}
              {!readOnly && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setCoverPicker(true)}>
                    {cover ? "Trocar capa" : "Escolher capa"}
                  </Button>
                  {data.coverMediaId && (
                    <Button size="sm" variant="ghost" onClick={() => update("coverMediaId", null)}>
                      <X className="size-3.5" /> Remover
                    </Button>
                  )}
                </div>
              )}
              <Field label="Texto alternativo" error={errors.coverAlt} counter={{ value: data.coverAlt.length, max: 300 }}>
                {(p) => <Textarea {...p} rows={2} value={data.coverAlt} readOnly={readOnly} maxLength={300} onChange={(e) => update("coverAlt", e.target.value)} />}
              </Field>
              <Field label="Legenda" optional error={errors.coverCaption}>
                {(p) => <Input {...p} value={data.coverCaption} readOnly={readOnly} maxLength={300} onChange={(e) => update("coverCaption", e.target.value)} />}
              </Field>
            </div>
          </Panel>

          <Panel title="Resumo e endereço">
            <div className="space-y-4">
              <Field label="Resumo" error={errors.excerpt} counter={{ value: data.excerpt.length, max: 320 }} hint="Aparece nas listas, na busca e no compartilhamento.">
                {(p) => <Textarea {...p} rows={4} value={data.excerpt} readOnly={readOnly} maxLength={320} onChange={(e) => update("excerpt", e.target.value)} />}
              </Field>
              <Field
                label="Endereço"
                error={errors.slug}
                hint={initial.publishedSlug && initial.publishedSlug !== data.slug ? `No ar continua /blog/${initial.publishedSlug} até publicar de novo.` : "Letras minúsculas, números e hífens."}
              >
                {(p) => (
                  <div className="flex items-stretch">
                    <span className="flex items-center rounded-l-md border border-r-0 border-zinc-300 bg-zinc-50 px-2 text-[13px] text-zinc-500">/blog/</span>
                    <Input
                      {...p}
                      className="rounded-l-none"
                      value={data.slug}
                      readOnly={readOnly}
                      maxLength={90}
                      onChange={(e) => {
                        setSlugTouched(true);
                        update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                      }}
                    />
                  </div>
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="Buscadores">
            <div className="space-y-4">
              <Field label="Título" optional error={errors.seoTitle} counter={{ value: data.seoTitle.length, max: 70 }} hint="Vazio: usa o título do artigo.">
                {(p) => <Input {...p} value={data.seoTitle} readOnly={readOnly} maxLength={70} onChange={(e) => update("seoTitle", e.target.value)} />}
              </Field>
              <Field label="Descrição" optional error={errors.seoDescription} counter={{ value: data.seoDescription.length, max: 170 }} hint="Vazio: usa o resumo.">
                {(p) => <Textarea {...p} rows={3} value={data.seoDescription} readOnly={readOnly} maxLength={170} onChange={(e) => update("seoDescription", e.target.value)} />}
              </Field>
            </div>
          </Panel>

          {!creating && (
            <Panel title={`Comentários${openComments.length ? ` (${openComments.length})` : ""}`}>
              <div className="space-y-3">
                {comments.length === 0 && <p className="text-[13px] text-zinc-500">Sem comentários ainda.</p>}
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className={cn("rounded-md border px-3 py-2.5 text-[13px]", c.kind === "changes_requested" ? "border-amber-200 bg-amber-50/60" : "border-zinc-200", c.resolvedAt && "opacity-60")}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
                        <span>
                          <span className="font-medium text-zinc-800">{c.authorName ?? "Sistema"}</span> · {relativeTime(c.createdAt)}
                          {c.kind === "changes_requested" && " · pediu ajustes"}
                        </span>
                        {perms.canComment && (
                          <button type="button" onClick={() => toggleResolved(c)} className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900" aria-label={c.resolvedAt ? "Reabrir comentário" : "Marcar como resolvido"}>
                            {c.resolvedAt ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Circle className="size-3.5" />}
                            {c.resolvedAt ? "Resolvido" : "Resolver"}
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-zinc-800">{c.body}</p>
                    </li>
                  ))}
                </ul>
                {perms.canComment && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newComment.trim()) addComment();
                    }}
                    className="space-y-2"
                  >
                    <label htmlFor="new-comment" className="sr-only">
                      Novo comentário
                    </label>
                    <Textarea id="new-comment" rows={3} value={newComment} maxLength={2000} placeholder="Escreva um comentário para a revisão" onChange={(e) => setNewComment(e.target.value)} />
                    <Button type="submit" size="sm" variant="secondary" loading={busy === "comment"} disabled={!newComment.trim()}>
                      <MessageSquare className="size-3.5" /> Comentar
                    </Button>
                  </form>
                )}
              </div>
            </Panel>
          )}

          {!creating && revisions.length > 0 && (
            <Panel title="Revisões">
              <ol className="space-y-2 text-[13px]">
                {revisions.map((r, i) => (
                  <li key={r.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-800">
                        <History className="mr-1 inline size-3.5 text-zinc-400" aria-hidden="true" />
                        {revisionReasons[r.reason] ?? r.reason} <span className="font-normal text-zinc-400">#{r.number}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {r.authorName ?? "Sistema"} · {formatDateTime(r.createdAt)}
                      </p>
                    </div>
                    {canEdit && i > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => setDialog({ restore: r })} disabled={busy !== null}>
                        <RotateCcw className="size-3.5" /> Restaurar
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {!creating && (actions.includes("archive") || actions.includes("restore") || perms.canDelete) && (
            <Panel title="Mais ações">
              <div className="flex flex-wrap gap-2">
                {actions.includes("restore") && (
                  <Button size="sm" variant="secondary" onClick={() => transition("restore")} loading={busy === "restore"}>
                    Restaurar como rascunho
                  </Button>
                )}
                {actions.includes("archive") && (
                  <Button size="sm" variant="secondary" onClick={() => setDialog("archive")} disabled={busy !== null}>
                    Arquivar
                  </Button>
                )}
                {perms.canDelete && (initial.status === "draft" || initial.status === "archived") && (
                  <Button size="sm" variant="secondary" className="text-red-700 hover:bg-red-50" onClick={() => setDialog("delete")} disabled={busy !== null}>
                    <Trash2 className="size-3.5" /> Excluir
                  </Button>
                )}
              </div>
            </Panel>
          )}
        </aside>
      </div>

      {/* Barra de ações fixa */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!creating && initial.status !== "archived" && (
            <Button variant="secondary" size="sm" onClick={preview} loading={busy === "preview"} disabled={busy !== null && busy !== "preview"}>
              {busy !== "preview" && <Eye className="size-3.5" />} Ver como no site
            </Button>
          )}
          {!readOnly && (
            <Button variant={creating ? "primary" : "secondary"} size="sm" onClick={save} loading={busy === "save"} disabled={(!dirty && !creating) || (busy !== null && busy !== "save")}>
              {creating ? "Criar rascunho" : "Salvar rascunho"}
            </Button>
          )}
          {!creating &&
            flowActions.map((a) => {
              const primary = a === "submit" || a === "approve" || a === "publish";
              const needsDialog = a === "publish" || a === "unpublish" || a === "request_changes" || a === "schedule";
              const label = a === "publish" && initial.status === "published" ? "Publicar alterações" : a === "schedule" && initial.status === "scheduled" ? "Reagendar" : TRANSITIONS[a].label;
              if (a === "publish" && initial.status === "published" && !initial.hasChanges && !dirty) return null;
              return (
                <Button key={a} size="sm" variant={primary ? "primary" : "secondary"} loading={busy === a} disabled={busy !== null && busy !== a} onClick={() => (needsDialog ? setDialog(a as Dialog) : transition(a))}>
                  {label}
                </Button>
              );
            })}
        </div>
      </div>

      <MediaPicker
        open={coverPicker}
        onClose={() => setCoverPicker(false)}
        canUpload={perms.canUpload}
        endpoint={MEDIA_ENDPOINT}
        title="Escolher capa"
        onPick={(m) => {
          setMedia((all) => ({ ...all, [m.id]: m }));
          update("coverMediaId", m.id);
          if (!data.coverAlt && m.alt) update("coverAlt", m.alt);
        }}
      />

      <ConfirmDialog
        open={dialog === "publish"}
        tone="primary"
        title={initial.status === "published" ? "Publicar as alterações?" : "Publicar o artigo?"}
        description={`O artigo fica disponível em /blog/${data.slug} imediatamente.`}
        confirmLabel="Publicar"
        loading={busy === "publish"}
        onConfirm={() => transition("publish")}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "unpublish"}
        title="Despublicar o artigo?"
        description="Ele sai do site e do RSS na hora e volta para Aprovado. O conteúdo continua salvo."
        confirmLabel="Despublicar"
        loading={busy === "unpublish"}
        onConfirm={() => transition("unpublish")}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "archive"}
        title="Arquivar o artigo?"
        description={initial.status === "published" ? "Ele sai do site imediatamente e fica guardado nos arquivados." : "Ele fica guardado nos arquivados e pode ser restaurado depois."}
        confirmLabel="Arquivar"
        loading={busy === "archive"}
        onConfirm={() => transition("archive")}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "request_changes"}
        tone="primary"
        title="Devolver com comentários"
        description="O artigo volta para rascunho e o autor vê o comentário ao abrir."
        confirmLabel="Devolver"
        loading={busy === "request_changes"}
        onConfirm={() => (comment.trim() ? transition("request_changes", { comment }) : setErrors({ comment: "Escreva o que o autor precisa ajustar." }))}
        onClose={() => setDialog(null)}
      >
        <Field label="O que precisa mudar" error={errors.comment}>
          {(p) => <Textarea {...p} rows={4} value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} />}
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "schedule"}
        tone="primary"
        title="Agendar publicação"
        description="O artigo entra no ar sozinho no horário escolhido, mesmo com o Studio fechado."
        confirmLabel="Agendar"
        loading={busy === "schedule"}
        onConfirm={() => transition("schedule", { scheduledAt: new Date(scheduleAt).toISOString() })}
        onClose={() => setDialog(null)}
      >
        <Field label="Data e hora" error={errors.scheduledAt} hint="No fuso horário deste computador.">
          {(p) => <Input {...p} type="datetime-local" value={scheduleAt} min={minSchedule} onChange={(e) => setScheduleAt(e.target.value)} />}
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={typeof dialog === "object" && dialog !== null && "restore" in dialog}
        tone="primary"
        title="Restaurar esta revisão?"
        description="O texto e os detalhes voltam para a versão escolhida. A versão atual continua no histórico."
        confirmLabel="Restaurar"
        loading={busy === "restore"}
        onConfirm={() => typeof dialog === "object" && dialog && "restore" in dialog && restore(dialog.restore)}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title="Excluir definitivamente?"
        description="O artigo, as revisões e os comentários são apagados. As imagens continuam na biblioteca. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={busy === "delete"}
        onConfirm={remove}
        onClose={() => {
          setDialog(null);
          setConfirmSlug("");
        }}
      >
        <Field label={`Digite ${initial.data.slug} para confirmar`} error={errors.confirmSlug}>
          {(p) => <Input {...p} value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} autoComplete="off" />}
        </Field>
      </ConfirmDialog>
    </div>
  );
}
