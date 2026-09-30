"use client";

import { siteHref } from "@/lib/cms/site-link";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Eye, Plus, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/cms/ui/field";
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
import { MODALITIES, MODALITY_KEYS, PARTNER_STATUSES, SECTORS, TIERS, TIER_KEYS } from "@/lib/alliance/constants";
import { PARTNER_LIMITS, partnerInputSchema, type PartnerInput } from "@/lib/alliance/validation";
import { slugify } from "@/lib/validation/projects";
import { cn } from "@/lib/utils";

export type PartnerEditorProps = {
  id: string | null;
  initial: { data: PartnerInput; version: number; published: boolean; hasChanges: boolean; publishedAt: string | null; publicSlug: string | null };
  media: Record<string, MediaPreview>;
  projects: { id: string; name: string; status: string }[];
  perms: { canEdit: boolean; canPublish: boolean; canUpload: boolean };
};

const PUBLIC_TEXT: FieldSpec[] = [
  { type: "text", key: "shortDescription", label: "Descrição curta", max: 220, multiline: true, hint: "Aparece no cartão do diretório. Obrigatória para publicar." },
  { type: "text", key: "description", label: "Descrição completa", max: 4000, multiline: true, optional: true, hint: "Só informações reais, fornecidas ou aprovadas pela empresa." },
  { type: "lines", key: "specialties", label: "Especialidades", itemLabel: "Especialidade", max: 50, min: 0, maxItems: PARTNER_LIMITS.specialties },
  { type: "lines", key: "services", label: "Serviços oferecidos", itemLabel: "Serviço", max: 60, min: 0, maxItems: PARTNER_LIMITS.services },
  { type: "text", key: "location", label: "Localização pública", max: 80, optional: true, hint: "Ex.: Ourinhos, SP. Vazio: não aparece." },
];

const SOCIAL: FieldSpec[] = [
  { type: "text", key: "websiteUrl", label: "Site oficial", max: 500, hint: "Endereço completo com https://. Obrigatório para publicar (é o destino do botão Visit)." },
  {
    type: "list",
    key: "socialLinks",
    label: "Redes sociais",
    itemLabel: "Rede",
    itemTitle: (item) => String(item.label ?? ""),
    min: 0,
    maxItems: PARTNER_LIMITS.social,
    newItem: () => ({ label: "", url: "" }),
    fields: [
      { type: "text", key: "label", label: "Nome", max: 30, hint: "Ex.: LinkedIn, Instagram." },
      { type: "text", key: "url", label: "Link", max: 500 },
    ],
  },
];

const SEO: FieldSpec[] = [
  { type: "text", key: "seoTitle", label: "Título para buscadores", max: 70, optional: true, hint: "Vazio: Rocket Vision × Nome do parceiro." },
  { type: "text", key: "seoDescription", label: "Descrição para buscadores", max: 170, multiline: true, optional: true, hint: "Vazio: usa a descrição curta." },
];

const INTERNAL: FieldSpec[] = [
  { type: "text", key: "legalName", label: "Razão social", max: 160, optional: true },
  { type: "text", key: "taxId", label: "CNPJ", max: 20, optional: true },
  { type: "text", key: "contactName", label: "Contato principal", max: 80, optional: true },
  { type: "text", key: "contactEmail", label: "E-mail do contato", max: 160, optional: true },
  { type: "text", key: "contactPhone", label: "Telefone do contato", max: 20, optional: true },
];

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[issue.path.map(String).join(".") || "_"] ??= issue.message;
  return errors;
}

type Busy = null | "save" | "publish" | "unpublish" | "preview";

export function PartnerEditor({ id, initial, media: initialMedia, projects, perms }: PartnerEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const creating = id === null;
  const readOnly = !perms.canEdit;

  const [data, setData] = useState<PartnerInput>(initial.data);
  const [saved, setSaved] = useState<PartnerInput>(initial.data);
  const [version, setVersion] = useState(initial.version);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState<null | "publish" | "unpublish">(null);
  const [conflict, setConflict] = useState(false);
  const [media, setMedia] = useState(initialMedia);
  const [slugTouched, setSlugTouched] = useState(!creating);
  const [galleryPicker, setGalleryPicker] = useState(false);

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(saved), [data, saved]);
  const pending = dirty || initial.hasChanges || !initial.published;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const clearErrors = useCallback((path: Path) => {
    const key = path.join(".");
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== key && !k.startsWith(`${key}.`) && !key.startsWith(`${k}.`))));
  }, []);

  const set = useCallback(
    (path: Path, value: unknown) => {
      clearErrors(path);
      setData((d) => {
        const next = setAt(d, path, value);
        if (path[0] === "tradeName" && !slugTouched) return { ...next, slug: slugify(String(value)) };
        return next;
      });
    },
    [slugTouched, clearErrors],
  );
  const update = <K extends keyof PartnerInput>(key: K, value: PartnerInput[K]) => set([key], value);

  function handleError(e: unknown) {
    const err = e as ApiError;
    setConfirm(null);
    if (err.status === 409 && err.code === "stale") return setConflict(true);
    if (Object.keys(err.fields ?? {}).length) {
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

  async function persist(): Promise<number | null> {
    const parsed = partnerInputSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      toast.error("Revise os campos destacados.");
      return null;
    }
    setErrors({});
    if (creating) {
      const created = await api<{ id: string }>("/api/cms/alliance/partners", { body: { data: parsed.data } });
      setSaved(data);
      toast.success("Parceiro cadastrado. Ele só aparece no site depois de publicado.");
      router.replace(`/cms/alliance/parceiros/${created.id}`);
      return null;
    }
    if (!dirty) return version;
    const result = await api<{ version: number }>(`/api/cms/alliance/partners/${id}`, { method: "PUT", body: { version, data: parsed.data } });
    setSaved(parsed.data);
    setVersion(result.version);
    return result.version;
  }

  const save = () =>
    run("save", async () => {
      const v = await persist();
      if (v !== null) {
        toast.success(initial.published ? "Alterações salvas. O site muda quando você publicar." : "Cadastro salvo.");
        router.refresh();
      }
    });

  const act = (kind: "publish" | "unpublish") =>
    run(kind, async () => {
      const v = kind === "publish" ? await persist() : version;
      if (v === null) return setConfirm(null);
      const result = await api<{ version: number }>(`/api/cms/alliance/partners/${id}/${kind}`, { body: { version: v } });
      setVersion(result.version);
      setConfirm(null);
      toast.success(kind === "publish" ? (initial.published ? "Alterações publicadas." : "Parceiro publicado no diretório.") : "Parceiro tirado do diretório.");
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
      if (tab) tab.location.href = `/api/cms/preview?path=${encodeURIComponent(`/partners/${data.slug}`)}`;
    });
  };

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
  const canPublishNow = data.status === "active" || data.status === "onboarding";

  return (
    <MediaContext.Provider value={{ media, remember: (m) => setMedia((all) => ({ ...all, [m.id]: m })), canUpload: perms.canUpload }}>
      {!creating && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-zinc-500">
          {initial.published ? <Badge tone="green">No diretório</Badge> : <Badge>Não publicado</Badge>}
          {initial.published && initial.publishedAt && <span>Publicado {relativeTime(initial.publishedAt)}</span>}
          {initial.published && initial.hasChanges && !dirty && <Badge tone="amber">Alterações não publicadas</Badge>}
          {dirty && <Badge tone="blue">Alterações não salvas</Badge>}
          {initial.publicSlug && (
            <a href={siteHref(`/partners/${initial.publicSlug}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              /partners/{initial.publicSlug} <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      {conflict && (
        <div role="alert" className="mb-5 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>Outra pessoa alterou este parceiro enquanto você editava. Recarregue para ver a versão atual. As suas alterações não salvas serão perdidas.</p>
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </div>
      )}
      {errorCount > 0 && (
        <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {errorCount === 1 ? "Um campo precisa de revisão." : `${errorCount} campos precisam de revisão.`} Os campos estão destacados abaixo.
        </p>
      )}

      <div className="space-y-6">
        <Panel title="Programa" description="Situação, nível e modalidades. Mudar o nível avisa a empresa no Hub e por e-mail.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome comercial" error={errors.tradeName} counter={{ value: data.tradeName.length, max: 80 }}>
              {(p) => <Input {...p} value={data.tradeName} readOnly={readOnly} maxLength={80} onChange={(e) => set(["tradeName"], e.target.value)} />}
            </Field>
            <Field label="Endereço da página" error={errors.slug} hint={initial.publicSlug && initial.publicSlug !== data.slug ? `O endereço publicado continua /partners/${initial.publicSlug} até publicar.` : "Letras minúsculas, números e hífens."}>
              {(p) => (
                <div className="flex items-stretch">
                  <span className="flex items-center rounded-l-md border border-r-0 border-zinc-300 bg-zinc-50 px-2.5 text-sm text-zinc-500">/partners/</span>
                  <Input
                    {...p}
                    className="rounded-l-none"
                    value={data.slug}
                    readOnly={readOnly}
                    maxLength={60}
                    onChange={(e) => {
                      setSlugTouched(true);
                      update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                    }}
                  />
                </div>
              )}
            </Field>
            <Field label="Situação" error={errors.status} hint="Suspender ou encerrar tira do diretório e encerra os acessos ao Hub.">
              {(p) => (
                <Select {...p} value={data.status} disabled={readOnly} onChange={(e) => update("status", e.target.value as PartnerInput["status"])}>
                  {PARTNER_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Nível" error={errors.tierKey}>
              {(p) => (
                <Select {...p} value={data.tierKey} disabled={readOnly} onChange={(e) => update("tierKey", e.target.value as PartnerInput["tierKey"])}>
                  {TIER_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {TIERS[k].name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <fieldset className="mt-5">
            <legend className="mb-1.5 text-[13px] font-medium text-zinc-900">Modalidades autorizadas</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {MODALITY_KEYS.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-zinc-300 accent-zinc-900"
                    disabled={readOnly}
                    checked={data.modalities.includes(k)}
                    onChange={(e) => update("modalities", e.target.checked ? [...data.modalities, k] : data.modalities.filter((x) => x !== k))}
                  />
                  {MODALITIES[k].name}
                </label>
              ))}
            </div>
            {errors.modalities && <p className="mt-1.5 text-[13px] text-red-600">{errors.modalities}</p>}
          </fieldset>
          <div className="mt-5 space-y-4 border-t border-zinc-100 pt-5">
            <Switch label="Mostrar o nível no site" description="Só com autorização da empresa. Desligado: o diretório e a página não mostram o nível." checked={data.showTier} disabled={readOnly} onChange={(v) => update("showTier", v)} />
            <Switch label="Partner Manager convida membros" description="Permite que gerentes da empresa convidem novos membros pelo Hub." checked={data.managersInvite} disabled={readOnly} onChange={(v) => update("managersInvite", v)} />
          </div>
        </Panel>

        <Panel title="Perfil público" description="O que aparece no diretório e na página exclusiva. Nada de dados internos aqui.">
          <div className="space-y-5">
            <Field label="Setor de atuação" error={errors.sector}>
              {(p) => (
                <Select {...p} value={data.sector} disabled={readOnly} onChange={(e) => update("sector", e.target.value)}>
                  <option value="">Escolha o setor</option>
                  {[...new Set([...SECTORS, ...(data.sector ? [data.sector] : [])])].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Fields specs={PUBLIC_TEXT} path={[]} form={form} />
            <Fields specs={SOCIAL} path={[]} form={form} />
          </div>
        </Panel>

        <Panel title="Identidade visual" description="Logos em alta resolução (PNG com fundo transparente). SVG não é aceito pela biblioteca.">
          <div className="grid gap-5 sm:grid-cols-2">
            <MediaSlot label="Logotipo" value={data.logoMediaId} onChange={(v) => update("logoMediaId", v)} error={errors.logoMediaId} readOnly={readOnly} aspect="aspect-[3/1]" hint="Para fundos claros. Obrigatório para publicar." />
            <MediaSlot label="Logotipo alternativo" optional value={data.logoAltMediaId} onChange={(v) => update("logoAltMediaId", v)} readOnly={readOnly} aspect="aspect-[3/1]" hint="Versão para fundos escuros (o hero da página é escuro)." />
            <MediaSlot label="Imagem de capa" optional value={data.coverMediaId} onChange={(v) => update("coverMediaId", v)} readOnly={readOnly} aspect="aspect-[16/9]" hint="Abertura da página exclusiva. 1920×1080 ou maior." />
            <MediaSlot label="Imagem de compartilhamento" optional value={data.ogMediaId} onChange={(v) => update("ogMediaId", v)} readOnly={readOnly} aspect="aspect-[1200/630]" hint="1200×630 para redes sociais. Vazio: usa a capa." />
            <Field label="Cor de destaque" error={errors.accentColor} hint="Detalhes da página exclusiva (linhas, marcadores). Use a cor da marca do parceiro.">
              {(p) => (
                <div className="flex gap-2">
                  <input type="color" aria-label="Escolher cor" value={/^#[0-9a-f]{6}$/i.test(data.accentColor) ? data.accentColor : "#2c9df5"} disabled={readOnly} onChange={(e) => update("accentColor", e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-zinc-300 bg-white p-1" />
                  <Input {...p} value={data.accentColor} readOnly={readOnly} maxLength={7} onChange={(e) => update("accentColor", e.target.value.toLowerCase())} className="max-w-32 font-mono" />
                </div>
              )}
            </Field>
          </div>
        </Panel>

        <Panel title="Galeria" description="Imagens da página exclusiva, na ordem em que aparecem.">
          {data.gallery.length === 0 ? (
            <p className="text-[13px] text-zinc-500">Nenhuma imagem na galeria.</p>
          ) : (
            <ol className="space-y-3">
              {data.gallery.map((g, i) => (
                <GalleryRow
                  key={`${g.mediaId}-${i}`}
                  index={i}
                  total={data.gallery.length}
                  item={g}
                  readOnly={readOnly}
                  onCaption={(v) => set(["gallery", i, "caption"], v)}
                  onMove={(to) => update("gallery", move(data.gallery, i, to))}
                  onRemove={() => update("gallery", data.gallery.filter((_, j) => j !== i))}
                />
              ))}
            </ol>
          )}
          {!readOnly && data.gallery.length < PARTNER_LIMITS.gallery && (
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => setGalleryPicker(true)}>
              <Plus className="size-3.5" /> Adicionar imagem
            </Button>
          )}
        </Panel>

        <Panel title="Projetos conjuntos" description="Projetos do portfólio feitos com este parceiro. No site aparecem só os publicados.">
          <ProjectPicker projects={projects} value={data.projectIds} readOnly={readOnly} onChange={(ids) => update("projectIds", ids)} />
        </Panel>

        <Panel title="Depoimentos" description="Só os marcados como aprovados vão para o site. Nunca publique depoimento sem autorização por escrito.">
          <Testimonials value={data.testimonials} readOnly={readOnly} errors={errors} onChange={(v) => update("testimonials", v)} />
        </Panel>

        <Panel title="SEO">
          <Fields specs={SEO} path={[]} form={form} />
        </Panel>

        <Panel title="Dados internos" description="Nunca aparecem no site nem no diretório.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Fields specs={INTERNAL.slice(0, 2)} path={[]} form={form} />
            <Fields specs={INTERNAL.slice(2)} path={[]} form={form} />
          </div>
        </Panel>

        <Panel title="Avaliação" description="Apoia a decisão de evolução de nível: resultados, qualidade das indicações, satisfação dos clientes e cumprimento das regras.">
          <div className="grid gap-5 sm:grid-cols-3">
            <ScoreSelect label="Qualidade das indicações" value={data.qualityScore} readOnly={readOnly} onChange={(v) => update("qualityScore", v)} />
            <ScoreSelect label="Satisfação dos clientes" value={data.satisfactionScore} readOnly={readOnly} onChange={(v) => update("satisfactionScore", v)} />
            <div className="pt-6">
              <Switch label="Cumpre as regras do programa" checked={data.complianceOk} disabled={readOnly} onChange={(v) => update("complianceOk", v)} />
            </div>
          </div>
          <Field label="Anotações internas" optional className="mt-5" error={errors.internalNotes}>
            {(p) => <Textarea {...p} rows={4} value={data.internalNotes} readOnly={readOnly} maxLength={4000} onChange={(e) => update("internalNotes", e.target.value)} />}
          </Field>
        </Panel>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!creating && perms.canPublish && initial.published && (
            <Button variant="ghost" size="sm" onClick={() => setConfirm("unpublish")} disabled={busy !== null}>
              <Undo2 className="size-3.5" /> Tirar do diretório
            </Button>
          )}
          {!creating && (
            <Button variant="secondary" size="sm" onClick={preview} loading={busy === "preview"} disabled={busy !== null && busy !== "preview"}>
              {busy !== "preview" && <Eye className="size-3.5" />} Pré-visualizar
            </Button>
          )}
          {!readOnly && (
            <Button variant={creating ? "primary" : "secondary"} size="sm" onClick={save} loading={busy === "save"} disabled={(!dirty && !creating) || (busy !== null && busy !== "save")}>
              {creating ? "Cadastrar parceiro" : "Salvar"}
            </Button>
          )}
          {!creating && perms.canPublish && (
            <Button size="sm" onClick={() => setConfirm("publish")} disabled={!pending || busy !== null || !canPublishNow} title={canPublishNow ? undefined : "Só parceiros ativos ou em onboarding podem ser publicados."}>
              {initial.published ? "Publicar alterações" : "Publicar no diretório"}
            </Button>
          )}
        </div>
      </div>

      <MediaPicker
        open={galleryPicker}
        onClose={() => setGalleryPicker(false)}
        canUpload={perms.canUpload}
        title="Adicionar imagem à galeria"
        onPick={(m) => {
          setMedia((all) => ({ ...all, [m.id]: m }));
          update("gallery", [...data.gallery, { mediaId: m.id, caption: "" }].slice(0, PARTNER_LIMITS.gallery));
        }}
      />
      <ConfirmDialog
        open={confirm === "publish"}
        tone="primary"
        title={initial.published ? "Publicar as alterações?" : "Publicar no diretório?"}
        description={`O perfil e a página exclusiva ficam disponíveis em /partners/${data.slug} imediatamente. Dados internos nunca vão para o site.`}
        confirmLabel="Publicar"
        loading={busy === "publish"}
        onConfirm={() => act("publish")}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "unpublish"}
        title="Tirar do diretório?"
        description={`O parceiro sai do diretório e /partners/${initial.publicSlug} passa a mostrar "página não encontrada". O cadastro continua salvo.`}
        confirmLabel="Tirar do ar"
        loading={busy === "unpublish"}
        onConfirm={() => act("unpublish")}
        onClose={() => setConfirm(null)}
      />
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

function GalleryRow({
  index,
  total,
  item,
  readOnly,
  onCaption,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  item: { mediaId: string; caption: string };
  readOnly: boolean;
  onCaption: (v: string) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const { media } = useContext(MediaContext);
  const m = media[item.mediaId];
  return (
    <li className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-2.5">
      <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded bg-zinc-100">
        {m && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.url} alt="" className="absolute inset-0 size-full object-cover" />
        )}
      </div>
      <Input aria-label={`Legenda da imagem ${index + 1}`} placeholder="Legenda (opcional)" value={item.caption} readOnly={readOnly} maxLength={140} onChange={(e) => onCaption(e.target.value)} />
      {!readOnly && (
        <div className="flex shrink-0">
          <IconBtn label={`Subir imagem ${index + 1}`} disabled={index === 0} onClick={() => onMove(index - 1)}>
            <ArrowUp className="size-3.5" />
          </IconBtn>
          <IconBtn label={`Descer imagem ${index + 1}`} disabled={index === total - 1} onClick={() => onMove(index + 1)}>
            <ArrowDown className="size-3.5" />
          </IconBtn>
          <IconBtn label={`Remover imagem ${index + 1}`} onClick={onRemove}>
            <X className="size-3.5" />
          </IconBtn>
        </div>
      )}
    </li>
  );
}

function ProjectPicker({ projects, value, readOnly, onChange }: { projects: { id: string; name: string; status: string }[]; value: string[]; readOnly: boolean; onChange: (ids: string[]) => void }) {
  const [adding, setAdding] = useState("");
  const chosen = value.map((id) => projects.find((p) => p.id === id) ?? { id, name: "Projeto removido", status: "missing" });
  const available = projects.filter((p) => !value.includes(p.id));
  return (
    <div>
      {chosen.length === 0 ? (
        <p className="text-[13px] text-zinc-500">Nenhum projeto conjunto.</p>
      ) : (
        <ol className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
          {chosen.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-zinc-900">{p.name}</span>
              {p.status !== "published" && <Badge tone={p.status === "missing" ? "red" : "neutral"}>{p.status === "missing" ? "Removido" : "Não publicado"}</Badge>}
              {!readOnly && (
                <div className="flex">
                  <IconBtn label={`Subir ${p.name}`} disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))}>
                    <ArrowUp className="size-3.5" />
                  </IconBtn>
                  <IconBtn label={`Descer ${p.name}`} disabled={i === chosen.length - 1} onClick={() => onChange(move(value, i, i + 1))}>
                    <ArrowDown className="size-3.5" />
                  </IconBtn>
                  <IconBtn label={`Remover ${p.name}`} onClick={() => onChange(value.filter((x) => x !== p.id))}>
                    <X className="size-3.5" />
                  </IconBtn>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {!readOnly && available.length > 0 && value.length < PARTNER_LIMITS.projects && (
        <div className="mt-3 flex gap-2">
          <Select aria-label="Escolher projeto" value={adding} onChange={(e) => setAdding(e.target.value)} className="max-w-sm">
            <option value="">Escolha um projeto do portfólio</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.status !== "published" ? " (não publicado)" : ""}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            disabled={!adding}
            onClick={() => {
              onChange([...value, adding]);
              setAdding("");
            }}
          >
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}

function Testimonials({
  value,
  readOnly,
  errors,
  onChange,
}: {
  value: PartnerInput["testimonials"];
  readOnly: boolean;
  errors: Record<string, string>;
  onChange: (v: PartnerInput["testimonials"]) => void;
}) {
  const setItem = (i: number, patch: Partial<PartnerInput["testimonials"][number]>) => onChange(value.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className="space-y-4">
      {value.length === 0 && <p className="text-[13px] text-zinc-500">Nenhum depoimento.</p>}
      {value.map((t, i) => (
        <div key={i} className={cn("rounded-md border p-4", t.approved ? "border-emerald-200 bg-emerald-50/40" : "border-zinc-200 bg-white")}>
          <Field label="Depoimento" error={errors[`testimonials.${i}.quote`]}>
            {(p) => <Textarea {...p} rows={3} value={t.quote} readOnly={readOnly} maxLength={600} onChange={(e) => setItem(i, { quote: e.target.value })} />}
          </Field>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Autor" error={errors[`testimonials.${i}.author`]}>
              {(p) => <Input {...p} value={t.author} readOnly={readOnly} maxLength={80} onChange={(e) => setItem(i, { author: e.target.value })} />}
            </Field>
            <Field label="Cargo e empresa" optional>
              {(p) => <Input {...p} value={t.role} readOnly={readOnly} maxLength={80} onChange={(e) => setItem(i, { role: e.target.value })} />}
            </Field>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Switch label="Aprovado para publicação" checked={t.approved} disabled={readOnly} onChange={(v) => setItem(i, { approved: v })} />
            {!readOnly && (
              <Button variant="ghost" size="sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 className="size-3.5" /> Remover
              </Button>
            )}
          </div>
        </div>
      ))}
      {!readOnly && value.length < PARTNER_LIMITS.testimonials && (
        <Button variant="secondary" size="sm" onClick={() => onChange([...value, { quote: "", author: "", role: "", approved: false }])}>
          <Plus className="size-3.5" /> Adicionar depoimento
        </Button>
      )}
    </div>
  );
}

function ScoreSelect({ label, value, readOnly, onChange }: { label: string; value: number | null; readOnly: boolean; onChange: (v: number | null) => void }) {
  return (
    <Field label={label} optional>
      {(p) => (
        <Select {...p} value={value ?? ""} disabled={readOnly} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Sem avaliação</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} de 5
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
