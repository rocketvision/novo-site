"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/cms/ui/field";
import { Badge, Panel } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { BLOCK_KINDS, blockLabel, newBlock, partnerPageSchema, type BlockKind, type PageBlock, type PartnerPageContent } from "@/lib/alliance/page-blocks";
import { cn } from "@/lib/utils";

/**
 * Editor da página exclusiva do parceiro: o cabeçalho e os blocos, na ordem do site. Salvar não muda
 * o site; "Publicar" congela a página junto com o perfil (o mesmo botão do cadastro).
 * Blocos vazios não aparecem no site, então a estrutura pode ficar pronta antes dos textos.
 */
export function PartnerPageEditor({
  partnerId,
  partnerName,
  slug,
  initial,
  version: initialVersion,
  perms,
  hints,
}: {
  partnerId: string;
  partnerName: string;
  slug: string;
  initial: PartnerPageContent;
  version: number;
  perms: { canPublish: boolean; published: boolean };
  hints: { specialties: number; projects: number; gallery: number; testimonials: number; website: boolean };
}) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [version, setVersion] = useState(initialVersion);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "save" | "preview" | "publish">(null);
  const [adding, setAdding] = useState<BlockKind>("text");
  const [confirm, setConfirm] = useState(false);
  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(saved), [data, saved]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const setBlock = (i: number, patch: Partial<PageBlock>) => setData((d) => ({ ...d, blocks: d.blocks.map((b, j) => (j === i ? ({ ...b, ...patch } as PageBlock) : b)) }));
  const moveBlock = (from: number, to: number) =>
    setData((d) => {
      const blocks = [...d.blocks];
      const [b] = blocks.splice(from, 1);
      blocks.splice(to, 0, b);
      return { ...d, blocks };
    });

  async function persist() {
    const parsed = partnerPageSchema.safeParse(data);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[i.path.join(".")] ??= i.message;
      setErrors(e);
      toast.error("Revise os campos destacados.");
      return null;
    }
    setErrors({});
    if (!dirty) return version;
    const result = await api<{ version: number }>(`/api/cms/alliance/partners/${partnerId}/page`, { method: "PUT", body: { version, content: parsed.data } });
    setSaved(parsed.data);
    setVersion(result.version);
    return result.version;
  }

  async function run(kind: "save" | "preview" | "publish", fn: () => Promise<void>) {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      const err = e as ApiError;
      setConfirm(false);
      if (err.status === 409 && err.code === "stale") toast.error("Outra pessoa alterou este parceiro. Recarregue a página.");
      else {
        if (Object.keys(err.fields ?? {}).length) setErrors(err.fields);
        toast.error(err.message);
      }
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run("save", async () => {
      if ((await persist()) !== null) {
        toast.success(perms.published ? "Página salva. O site muda quando você publicar." : "Página salva.");
        router.refresh();
      }
    });

  const preview = () => {
    const tab = window.open("about:blank", "_blank");
    return run("preview", async () => {
      const v = await persist().catch((e) => {
        tab?.close();
        throw e;
      });
      if (v === null) return void tab?.close();
      if (tab) tab.location.href = `/api/cms/preview?path=${encodeURIComponent(`/partners/${slug}`)}`;
    });
  };

  const publish = () =>
    run("publish", async () => {
      const v = await persist();
      if (v === null) return setConfirm(false);
      const result = await api<{ version: number }>(`/api/cms/alliance/partners/${partnerId}/publish`, { body: { version: v } });
      setVersion(result.version);
      setConfirm(false);
      toast.success("Perfil e página publicados.");
      router.refresh();
    });

  const autoHint: Partial<Record<BlockKind, string>> = {
    expertise: hints.specialties ? `${hints.specialties} especialidades e serviços do cadastro.` : "O cadastro ainda não tem especialidades nem serviços: o bloco não aparece.",
    projects: hints.projects ? `${hints.projects} projetos conjuntos escolhidos no cadastro.` : "Nenhum projeto conjunto no cadastro: o bloco não aparece.",
    gallery: hints.gallery ? `${hints.gallery} imagens da galeria do cadastro.` : "A galeria do cadastro está vazia: o bloco não aparece.",
    testimonials: hints.testimonials ? `${hints.testimonials} depoimentos aprovados.` : "Nenhum depoimento aprovado: o bloco não aparece.",
    explore: "Outros parceiros publicados no diretório.",
  };

  return (
    <>
      <Panel title="Abertura" description={`O hero mostra os logotipos da Rocket Vision e da ${partnerName} lado a lado, sobre a capa do cadastro.`}>
        <div className="space-y-5">
          <Field label="Título" hint='Ex.: "Duas visões. Um futuro em comum."' error={errors["hero.title"]} counter={{ value: data.hero.title.length, max: 90 }}>
            {(p) => <Input {...p} value={data.hero.title} maxLength={90} onChange={(e) => setData((d) => ({ ...d, hero: { ...d.hero, title: e.target.value } }))} />}
          </Field>
          <Field label="Apresentação da parceria" optional hint="Um parágrafo curto. Só informações reais, aprovadas pela empresa." error={errors["hero.subtitle"]} counter={{ value: data.hero.subtitle.length, max: 400 }}>
            {(p) => <Textarea {...p} rows={3} value={data.hero.subtitle} maxLength={400} onChange={(e) => setData((d) => ({ ...d, hero: { ...d.hero, subtitle: e.target.value } }))} />}
          </Field>
        </div>
      </Panel>

      <div className="mt-6 space-y-3">
        {data.blocks.map((block, i) => (
          <section key={block.id} className={cn("rounded-lg border bg-white", block.visible ? "border-zinc-200" : "border-dashed border-zinc-300 opacity-75")} aria-label={`Bloco ${i + 1}: ${blockLabel(block.kind)}`}>
            <header className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5">
              <span className="text-[13px] font-semibold text-zinc-900">{blockLabel(block.kind)}</span>
              {"title" in block && block.title && <span className="truncate text-[13px] text-zinc-500">· {block.title}</span>}
              {!block.visible && <Badge>Oculto</Badge>}
              <span className="ml-auto flex">
                <Icon label={block.visible ? "Ocultar bloco" : "Mostrar bloco"} onClick={() => setBlock(i, { visible: !block.visible })}>
                  {block.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </Icon>
                <Icon label="Subir bloco" disabled={i === 0} onClick={() => moveBlock(i, i - 1)}>
                  <ArrowUp className="size-3.5" />
                </Icon>
                <Icon label="Descer bloco" disabled={i === data.blocks.length - 1} onClick={() => moveBlock(i, i + 1)}>
                  <ArrowDown className="size-3.5" />
                </Icon>
                <Icon label="Remover bloco" onClick={() => setData((d) => ({ ...d, blocks: d.blocks.filter((_, j) => j !== i) }))}>
                  <Trash2 className="size-3.5" />
                </Icon>
              </span>
            </header>
            <div className="space-y-4 p-4">
              {"eyebrow" in block && (
                <Field label="Rótulo" optional error={errors[`blocks.${i}.eyebrow`]}>
                  {(p) => <Input {...p} value={block.eyebrow} maxLength={60} onChange={(e) => setBlock(i, { eyebrow: e.target.value })} />}
                </Field>
              )}
              {"title" in block && (
                <Field label="Título" optional error={errors[`blocks.${i}.title`]}>
                  {(p) => <Input {...p} value={block.title} maxLength={120} onChange={(e) => setBlock(i, { title: e.target.value })} />}
                </Field>
              )}
              {block.kind === "text" && (
                <Field label="Texto" hint="Separe os parágrafos com uma linha em branco. Vazio: o bloco não aparece." error={errors[`blocks.${i}.body`]} counter={{ value: block.body.length, max: 4000 }}>
                  {(p) => <Textarea {...p} rows={6} value={block.body} maxLength={4000} onChange={(e) => setBlock(i, { body: e.target.value })} />}
                </Field>
              )}
              {block.kind === "cta" && (
                <>
                  <Field label="Texto" optional error={errors[`blocks.${i}.body`]}>
                    {(p) => <Textarea {...p} rows={2} value={block.body} maxLength={400} onChange={(e) => setBlock(i, { body: e.target.value })} />}
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Texto do botão" optional hint={`Vazio: "Visitar o site da ${partnerName}".`} error={errors[`blocks.${i}.label`]}>
                      {(p) => <Input {...p} value={block.label} maxLength={40} onChange={(e) => setBlock(i, { label: e.target.value })} />}
                    </Field>
                    <Field label="Link" optional hint={hints.website ? "Vazio: o site oficial do cadastro." : "Vazio e sem site no cadastro: o bloco não aparece."} error={errors[`blocks.${i}.url`]}>
                      {(p) => <Input {...p} value={block.url} maxLength={500} placeholder="https://" onChange={(e) => setBlock(i, { url: e.target.value })} />}
                    </Field>
                  </div>
                </>
              )}
              {autoHint[block.kind] && <p className="text-[13px] text-zinc-500">{autoHint[block.kind]}</p>}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select aria-label="Tipo de bloco" value={adding} onChange={(e) => setAdding(e.target.value as BlockKind)} className="w-56">
          {BLOCK_KINDS.map((b) => (
            <option key={b.kind} value={b.kind}>
              {b.label}: {b.description}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={() => setData((d) => ({ ...d, blocks: [...d.blocks, newBlock(adding)] }))} disabled={data.blocks.length >= 20}>
          <Plus className="size-4" /> Adicionar bloco
        </Button>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty && <Badge tone="blue">Alterações não salvas</Badge>}
          <Button variant="secondary" size="sm" onClick={preview} loading={busy === "preview"} disabled={busy !== null && busy !== "preview"}>
            {busy !== "preview" && <Eye className="size-3.5" />} Pré-visualizar
          </Button>
          <Button variant="secondary" size="sm" onClick={save} loading={busy === "save"} disabled={!dirty || (busy !== null && busy !== "save")}>
            Salvar
          </Button>
          {perms.canPublish && (
            <Button size="sm" onClick={() => setConfirm(true)} disabled={busy !== null}>
              {perms.published ? "Publicar alterações" : "Publicar"}
            </Button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        tone="primary"
        title="Publicar o perfil e a página?"
        description={`A página /partners/${slug} passa a mostrar exatamente o que está aqui e no cadastro.`}
        confirmLabel="Publicar"
        loading={busy === "publish"}
        onConfirm={publish}
        onClose={() => setConfirm(false)}
      />
    </>
  );
}

function Icon({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30">
      {children}
    </button>
  );
}
