"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Badge } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { relativeTime } from "@/lib/cms/format";
import { SECTION_SCHEMAS, type SectionKey } from "@/lib/content/schemas";
import { Fields } from "./fields";
import { MediaContext, type MediaPreview } from "./image-field";
import { setAt, type Path } from "./path";
import { SECTION_FIELDS } from "./specs";

export type EditorState = {
  draft: unknown;
  version: number;
  hasChanges: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  publishedByName: string | null;
  draftUpdatedAt: string | null;
  draftUpdatedByName: string | null;
};

type Busy = null | "save" | "publish" | "preview" | "discard";

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * Editor de uma seção: rascunho → pré-visualização → publicação.
 * Valida no navegador com o mesmo schema do servidor (retorno imediato); o servidor valida de novo.
 */
export function SectionEditor({
  sectionKey,
  label,
  initial,
  media: initialMedia,
  perms,
  previewPath,
}: {
  sectionKey: SectionKey;
  label: string;
  initial: EditorState;
  media: Record<string, MediaPreview>;
  perms: { canEdit: boolean; canPublish: boolean; canUpload: boolean };
  previewPath: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(initial);
  const [content, setContent] = useState<unknown>(initial.draft);
  const [saved, setSaved] = useState<unknown>(initial.draft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [conflict, setConflict] = useState(false);
  const [confirm, setConfirm] = useState<null | "publish" | "discard">(null);
  const [media, setMedia] = useState(initialMedia);

  const dirty = useMemo(() => JSON.stringify(content) !== JSON.stringify(saved), [content, saved]);
  const pending = dirty || state.hasChanges;

  // Aviso do navegador ao sair com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = useCallback((path: Path, value: unknown) => {
    setContent((c: unknown) => setAt(c, path, value));
    // O erro de um campo some quando a pessoa mexe nele.
    const key = path.join(".");
    setErrors((e) => {
      const left = Object.fromEntries(Object.entries(e).filter(([k]) => k !== key && !k.startsWith(`${key}.`) && !key.startsWith(`${k}.`)));
      return Object.keys(left).length === Object.keys(e).length ? e : left;
    });
  }, []);

  function handleError(e: unknown) {
    const err = e as ApiError;
    // Fecha a confirmação: o erro precisa ficar visível no formulário.
    setConfirm(null);
    if (err.status === 409 && err.code === "stale") {
      setConflict(true);
      return;
    }
    if (Object.keys(err.fields).length > 0) {
      setErrors(err.fields);
      toast.error("Revise os campos destacados.");
      return;
    }
    toast.error(err.message);
  }

  /** Salva se houver algo a salvar. Devolve a versão atual, ou null se não foi possível. */
  async function persist(): Promise<number | null> {
    if (!dirty) return state.version;
    const parsed = SECTION_SCHEMAS[sectionKey].safeParse(content);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      toast.error("Revise os campos destacados.");
      return null;
    }
    setErrors({});
    const { version } = await api<{ version: number }>(`/api/cms/sections/${sectionKey}`, {
      method: "PUT",
      body: { version: state.version, content: parsed.data },
    });
    setContent(parsed.data);
    setSaved(parsed.data);
    setState((s) => ({ ...s, version, hasChanges: true, draftUpdatedAt: new Date().toISOString(), draftUpdatedByName: null }));
    return version;
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

  const save = () =>
    run("save", async () => {
      if ((await persist()) !== null) toast.success("Rascunho salvo. O site ainda mostra a versão publicada.");
    });

  const preview = () => {
    // A aba precisa ser aberta no clique (senão o navegador bloqueia); o destino é definido depois de salvar.
    const tab = window.open("about:blank", "_blank");
    return run("preview", async () => {
      let version: number | null = null;
      try {
        version = await persist();
      } finally {
        if (version === null) tab?.close();
      }
      if (version === null) return;
      const url = `/api/cms/preview?path=${encodeURIComponent(previewPath)}`;
      if (tab) tab.location.href = url;
      // Rota de API que redireciona: precisa de navegação completa, não do roteador do Next.
      else window.open(url, "_self");
    });
  };

  const publish = () =>
    run("publish", async () => {
      const version = await persist();
      if (version === null) return setConfirm(null);
      const result = await api<{ version: number }>(`/api/cms/sections/${sectionKey}/publish`, { body: { version } });
      setState((s) => ({ ...s, version: result.version, hasChanges: false, isPublished: true, publishedAt: new Date().toISOString(), publishedByName: null }));
      setConfirm(null);
      toast.success(`${label} publicado. O site já mostra esta versão.`);
      router.refresh();
    });

  const discard = () =>
    run("discard", async () => {
      await api(`/api/cms/sections/${sectionKey}/discard`, { body: { version: state.version } });
      // O editor não remonta: carrega o rascunho restaurado e segue editando dali.
      const { section } = await api<{ section: { draft: unknown; version: number } }>(`/api/cms/sections/${sectionKey}`);
      setContent(section.draft);
      setSaved(section.draft);
      setErrors({});
      setState((s) => ({ ...s, version: section.version, hasChanges: false }));
      setConfirm(null);
      toast.success("Rascunho descartado.");
      router.refresh();
    });

  // Ctrl/Cmd + S salva o rascunho.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (perms.canEdit && dirty) void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const form = { value: content, set, errors, readOnly: !perms.canEdit };
  const errorCount = Object.keys(errors).length;

  return (
    <MediaContext.Provider
      value={{ media, remember: (m) => setMedia((all) => ({ ...all, [m.id]: m })), canUpload: perms.canUpload }}
    >
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-zinc-500">
        {state.isPublished ? (
          <span>
            Publicado {state.publishedAt ? relativeTime(state.publishedAt) : ""}
            {state.publishedByName && ` por ${state.publishedByName}`}
          </span>
        ) : (
          <span>Ainda não publicado</span>
        )}
        {state.hasChanges && !dirty && <Badge tone="amber">Rascunho não publicado</Badge>}
        {dirty && <Badge tone="blue">Alterações não salvas</Badge>}
      </div>

      {conflict && (
        <div role="alert" className="mb-5 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>Outra pessoa alterou esta seção enquanto você editava. Recarregue para ver a versão atual. As suas alterações não salvas serão perdidas.</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              // Recarga completa, por escolha da pessoa: descarta o que não foi salvo e traz a versão atual.
              window.location.reload();
            }}
          >
            Recarregar
          </Button>
        </div>
      )}

      {errorCount > 0 && (
        <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {errorCount === 1 ? "Um campo precisa de revisão." : `${errorCount} campos precisam de revisão.`} Os campos estão destacados abaixo.
        </p>
      )}

      {/* Não é um <form>: o seletor de mídia (com a própria busca) abre dentro dele. Salvar: botão ou Ctrl/Cmd + S. */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 sm:p-6">
        <Fields specs={SECTION_FIELDS[sectionKey]} path={[]} form={form} />
      </div>

      {/* Barra de ações fixa no rodapé da tela, sempre ao alcance. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {perms.canEdit && state.isPublished && pending && (
            <Button variant="ghost" size="sm" className="mr-auto" onClick={() => setConfirm("discard")} disabled={busy !== null}>
              <RotateCcw className="size-3.5" /> Descartar alterações
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={preview} loading={busy === "preview"} disabled={busy !== null && busy !== "preview"}>
            {busy !== "preview" && <Eye className="size-3.5" />} Pré-visualizar
          </Button>
          {perms.canEdit && (
            <Button variant="secondary" size="sm" onClick={save} loading={busy === "save"} disabled={!dirty || (busy !== null && busy !== "save")}>
              Salvar rascunho
            </Button>
          )}
          {perms.canPublish && (
            <Button size="sm" onClick={() => setConfirm("publish")} disabled={!pending || busy !== null}>
              Publicar
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "publish"}
        tone="primary"
        title={`Publicar ${label}?`}
        description={dirty ? "As alterações serão salvas e o site passa a mostrar esta versão imediatamente." : "O site passa a mostrar esta versão imediatamente."}
        confirmLabel="Publicar"
        loading={busy === "publish"}
        onConfirm={publish}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "discard"}
        title="Descartar alterações?"
        description="O rascunho volta a ser igual à versão publicada. Alterações não salvas também serão perdidas."
        confirmLabel="Descartar"
        loading={busy === "discard"}
        onConfirm={discard}
        onClose={() => setConfirm(null)}
      />
    </MediaContext.Provider>
  );
}
