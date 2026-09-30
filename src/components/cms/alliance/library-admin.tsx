"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { formatBytes } from "@/lib/cms/format";
import { CONTRACT_KINDS, MODALITIES, OPPORTUNITY_KINDS, OPPORTUNITY_STATUSES, RESOURCE_CATEGORIES, TICKET_STATUSES, TIERS, type ModalityKey, type TierKey } from "@/lib/alliance/constants";

type Option = { id: string; tradeName: string };
type Errors = Record<string, string>;

/** Envio, estado e erros comuns aos formulários desta área. */
function useSubmit() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  async function run<T>(fn: () => Promise<T>, ok: string | ((r: T) => string), after?: (r: T) => void) {
    setBusy(true);
    setErrors({});
    try {
      const r = await fn();
      toast.success(typeof ok === "function" ? ok(r) : ok);
      after?.(r);
      router.refresh();
      return r;
    } catch (e) {
      setErrors((e as ApiError).fields ?? {});
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, errors, run, router };
}

/* -------------------------------------------------------------------------- */
/* Arquivo privado                                                             */
/* -------------------------------------------------------------------------- */

export type FileValue = { id: string; filename: string; sizeBytes?: number } | null;

export function FileField({ label, value, onChange, error, hint, downloadHref }: { label: string; value: FileValue; onChange: (v: FileValue) => void; error?: string; hint?: string; downloadHref?: string | null }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api<{ id: string; filename: string; sizeBytes: number }>("/api/cms/alliance/files", { formData: form });
      onChange(r);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div>
      <p className="text-[13px] font-medium text-zinc-900">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {value ? (
          <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[13px]">
            <FileText className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
            {downloadHref ? (
              <a href={downloadHref} className="truncate underline-offset-4 hover:underline">
                {value.filename}
              </a>
            ) : (
              <span className="truncate">{value.filename}</span>
            )}
            {value.sizeBytes ? <span className="text-xs text-zinc-500">{formatBytes(value.sizeBytes)}</span> : null}
            <button type="button" onClick={() => onChange(null)} className="rounded p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900" aria-label="Remover arquivo">
              <X className="size-3.5" />
            </button>
          </span>
        ) : null}
        <Button size="sm" variant="secondary" loading={busy} onClick={() => input.current?.click()}>
          <Upload className="size-3.5" aria-hidden="true" /> {value ? "Trocar" : "Enviar arquivo"}
        </Button>
        <input ref={input} type="file" className="sr-only" tabIndex={-1} accept=".pdf,.pptx,.docx,.xlsx,.zip,.png,.jpg,.jpeg,.webp,.mp4" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Público (segmentação)                                                       */
/* -------------------------------------------------------------------------- */

export type AudienceValue = { minTierRank: number; modalities: string[]; partnerIds: string[] };

export function AudienceFields({ value, onChange, partners }: { value: AudienceValue; onChange: (v: AudienceValue) => void; partners: Option[] }) {
  const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  return (
    <fieldset className="space-y-3 rounded-md border border-zinc-200 p-3">
      <legend className="px-1 text-[13px] font-medium text-zinc-900">Quem vê</legend>
      <Field label="Nível mínimo">
        {(f) => (
          <Select {...f} value={value.minTierRank} onChange={(e) => onChange({ ...value, minTierRank: Number(e.target.value) })}>
            {(Object.keys(TIERS) as TierKey[]).map((k) => (
              <option key={k} value={TIERS[k].rank}>
                {TIERS[k].rank === 1 ? "Todos os níveis" : `${TIERS[k].name} ou acima`}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div>
        <p className="text-[13px] font-medium text-zinc-900">Modalidades</p>
        <p className="text-xs text-zinc-500">Nenhuma marcada: todas.</p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {(Object.keys(MODALITIES) as ModalityKey[]).map((k) => (
            <label key={k} className="inline-flex items-center gap-2 text-[13px]">
              <input type="checkbox" className="size-4 accent-zinc-900" checked={value.modalities.includes(k)} onChange={() => onChange({ ...value, modalities: toggle(value.modalities, k) })} />
              {MODALITIES[k].name}
            </label>
          ))}
        </div>
      </div>
      {partners.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[13px] text-zinc-700">Só parceiros específicos {value.partnerIds.length > 0 && `(${value.partnerIds.length})`}</summary>
          <div className="mt-2 grid max-h-48 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {partners.map((p) => (
              <label key={p.id} className="inline-flex items-center gap-2 text-[13px]">
                <input type="checkbox" className="size-4 accent-zinc-900" checked={value.partnerIds.includes(p.id)} onChange={() => onChange({ ...value, partnerIds: toggle(value.partnerIds, p.id) })} />
                {p.tradeName}
              </label>
            ))}
          </div>
        </details>
      )}
    </fieldset>
  );
}

const EVERYONE: AudienceValue = { minTierRank: 1, modalities: [], partnerIds: [] };

/* -------------------------------------------------------------------------- */
/* Contratos                                                                   */
/* -------------------------------------------------------------------------- */

export type ContractFormValue = { partnerId: string; title: string; kind: string; startsOn: string | null; endsOn: string | null; terms: string; commercialTerms: string; file: FileValue };

export function ContractEditor({ id, initial, partners }: { id: string | null; initial: ContractFormValue; partners: Option[] }) {
  const { busy, errors, run, router } = useSubmit();
  const [v, setV] = useState(initial);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const { file, ...rest } = v;
    run(
      () => api<{ id: string }>(id ? `/api/cms/alliance/contracts/${id}` : "/api/cms/alliance/contracts", { method: id ? "PUT" : "POST", body: { ...rest, fileId: file?.id ?? null } }),
      id ? "Rascunho salvo." : "Contrato criado como rascunho.",
      (r) => !id && router.push(`/cms/alliance/contratos/${r.id}`),
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Parceiro" error={errors.partnerId} hint={id ? "Não muda depois de criado." : undefined}>
          {(f) => (
            <Select {...f} disabled={Boolean(id)} value={v.partnerId} onChange={(e) => setV({ ...v, partnerId: e.target.value })}>
              <option value="">Escolha</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tradeName}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Tipo" error={errors.kind}>
          {(f) => (
            <Select {...f} disabled={Boolean(id)} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
              {CONTRACT_KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Título" error={errors.title}>
        {(f) => <Input {...f} value={v.title} maxLength={120} onChange={(e) => setV({ ...v, title: e.target.value })} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início da vigência" optional error={errors.startsOn}>
          {(f) => <Input {...f} type="date" value={v.startsOn ?? ""} onChange={(e) => setV({ ...v, startsOn: e.target.value || null })} />}
        </Field>
        <Field label="Fim da vigência" optional error={errors.endsOn}>
          {(f) => <Input {...f} type="date" value={v.endsOn ?? ""} onChange={(e) => setV({ ...v, endsOn: e.target.value || null })} />}
        </Field>
      </div>
      <Field label="Condições comerciais" optional hint="Resumo interno das condições negociadas. Visível para quem tem acesso a contratos." error={errors.commercialTerms}>
        {(f) => <Textarea {...f} rows={3} value={v.commercialTerms} maxLength={4000} onChange={(e) => setV({ ...v, commercialTerms: e.target.value })} />}
      </Field>
      <Field label="Texto do termo" optional hint="É o que o parceiro lê e aceita no Hub. Ao enviar, o texto é congelado e o aceite registra o hash dele." error={errors.terms}>
        {(f) => <Textarea {...f} rows={14} value={v.terms} maxLength={60000} className="font-mono text-[13px]" onChange={(e) => setV({ ...v, terms: e.target.value })} />}
      </Field>
      <FileField label="Documento anexo" hint="PDF assinado ou minuta. Fica privado: só baixa quem tem permissão." value={v.file} onChange={(file) => setV({ ...v, file })} error={errors.fileId} downloadHref={id && initial.file?.id === v.file?.id ? `/api/cms/alliance/contracts/${id}/file` : null} />
      <Button type="submit" loading={busy}>
        {id ? "Salvar rascunho" : "Criar rascunho"}
      </Button>
    </form>
  );
}

const CONTRACT_ACTIONS: Record<string, { label: string; confirm: string; tone: "primary" | "danger"; from: string[] }> = {
  send: { label: "Enviar para aceite", confirm: "O texto é congelado e o parceiro (owner) recebe o aviso para aceitar no Hub.", tone: "primary", from: ["draft"] },
  activate: { label: "Marcar como vigente", confirm: "Use quando o aceite aconteceu fora do Hub (ex.: assinatura digital).", tone: "primary", from: ["sent", "draft"] },
  back_to_draft: { label: "Voltar para rascunho", confirm: "Cancela o envio. O parceiro não poderá mais aceitar esta versão.", tone: "danger", from: ["sent"] },
  expire: { label: "Marcar como vencido", confirm: "O contrato deixa de estar vigente.", tone: "danger", from: ["active"] },
  terminate: { label: "Encerrar", confirm: "Encerra o contrato. O registro fica no histórico.", tone: "danger", from: ["sent", "active"] },
};

export function ContractActions({ id, status }: { id: string; status: string }) {
  const { busy, run } = useSubmit();
  const [confirm, setConfirm] = useState<string | null>(null);
  const actions = Object.entries(CONTRACT_ACTIONS).filter(([, a]) => a.from.includes(status));
  if (actions.length === 0) return null;
  const current = confirm ? CONTRACT_ACTIONS[confirm] : null;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(([key, a]) => (
        <Button key={key} size="sm" variant={a.tone === "primary" ? "primary" : "secondary"} onClick={() => setConfirm(key)}>
          {a.label}
        </Button>
      ))}
      <ConfirmDialog
        open={current !== null}
        title={`${current?.label}?`}
        description={current?.confirm}
        confirmLabel={current?.label ?? ""}
        tone={current?.tone}
        loading={busy}
        onConfirm={() => run(() => api(`/api/cms/alliance/contracts/${id}/status`, { body: { action: confirm } }), "Contrato atualizado.", () => setConfirm(null))}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Recursos                                                                    */
/* -------------------------------------------------------------------------- */

export type ResourceFormValue = AudienceValue & { title: string; description: string; category: string; file: FileValue; url: string; status: "draft" | "published"; sortOrder: number };
export const EMPTY_RESOURCE: ResourceFormValue = { ...EVERYONE, title: "", description: "", category: "sales", file: null, url: "", status: "draft", sortOrder: 0 };

export function ResourceEditor({ id, initial, partners, onDone }: { id: string | null; initial: ResourceFormValue; partners: Option[]; onDone?: () => void }) {
  const { busy, errors, run } = useSubmit();
  const [v, setV] = useState(initial);
  const [remove, setRemove] = useState(false);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const { file, ...rest } = v;
    run(() => api(id ? `/api/cms/alliance/resources/${id}` : "/api/cms/alliance/resources", { method: id ? "PUT" : "POST", body: { ...rest, fileId: file?.id ?? null, url: file ? "" : v.url } }), id ? "Material salvo." : "Material criado.", () => {
      if (!id) setV(EMPTY_RESOURCE);
      onDone?.();
    });
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Título" error={errors.title}>
        {(f) => <Input {...f} value={v.title} maxLength={120} onChange={(e) => setV({ ...v, title: e.target.value })} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoria" error={errors.category}>
          {(f) => (
            <Select {...f} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Ordem" hint="Menor aparece primeiro." error={errors.sortOrder}>
          {(f) => <Input {...f} inputMode="numeric" value={String(v.sortOrder)} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value.replace(/\D/g, "") || 0) })} />}
        </Field>
      </div>
      <Field label="Descrição" optional error={errors.description}>
        {(f) => <Textarea {...f} rows={2} value={v.description} maxLength={1000} onChange={(e) => setV({ ...v, description: e.target.value })} />}
      </Field>
      <FileField label="Arquivo" hint="Ou informe um link abaixo (um dos dois)." value={v.file} onChange={(file) => setV({ ...v, file })} error={errors.fileId} downloadHref={id && initial.file?.id === v.file?.id ? `/api/cms/alliance/resources/${id}/file` : null} />
      {!v.file && (
        <Field label="Link" optional hint="Ex.: pasta compartilhada ou vídeo. Precisa ser https." error={errors.url}>
          {(f) => <Input {...f} type="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} />}
        </Field>
      )}
      <AudienceFields value={v} onChange={(a) => setV({ ...v, ...a })} partners={partners} />
      <Switch label="Publicado no Hub" checked={v.status === "published"} onChange={(on) => setV({ ...v, status: on ? "published" : "draft" })} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {id ? "Salvar" : "Criar material"}
        </Button>
        {id && (
          <Button variant="ghost" onClick={() => setRemove(true)}>
            Remover
          </Button>
        )}
      </div>
      {id && (
        <ConfirmDialog
          open={remove}
          title="Remover este material?"
          description="Some do Hub. O arquivo continua guardado para o histórico."
          confirmLabel="Remover"
          loading={busy}
          onConfirm={() => run(() => api(`/api/cms/alliance/resources/${id}`, { method: "DELETE" }), "Material removido.", () => setRemove(false))}
          onClose={() => setRemove(false)}
        />
      )}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Oportunidades                                                               */
/* -------------------------------------------------------------------------- */

export type OpportunityFormValue = AudienceValue & { title: string; kind: string; summary: string; description: string; status: string; deadline: string | null };
export const EMPTY_OPPORTUNITY: OpportunityFormValue = { ...EVERYONE, title: "", kind: "joint_project", summary: "", description: "", status: "draft", deadline: null };

export function OpportunityEditor({ id, initial, partners }: { id: string | null; initial: OpportunityFormValue; partners: Option[] }) {
  const { busy, errors, run, router } = useSubmit();
  const [v, setV] = useState(initial);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(
      () => api<{ id: string }>(id ? `/api/cms/alliance/opportunities/${id}` : "/api/cms/alliance/opportunities", { method: id ? "PUT" : "POST", body: v }),
      v.status === "open" && initial.status !== "open" ? "Oportunidade aberta. As empresas elegíveis foram avisadas no Hub." : "Oportunidade salva.",
      (r) => !id && router.push(`/cms/alliance/recursos/oportunidades/${r.id}`),
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Título" error={errors.title}>
        {(f) => <Input {...f} value={v.title} maxLength={120} onChange={(e) => setV({ ...v, title: e.target.value })} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tipo" error={errors.kind}>
          {(f) => (
            <Select {...f} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
              {OPPORTUNITY_KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Situação" error={errors.status}>
          {(f) => (
            <Select {...f} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>
              {OPPORTUNITY_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Prazo para interesse" optional error={errors.deadline}>
          {(f) => <Input {...f} type="date" value={v.deadline ?? ""} onChange={(e) => setV({ ...v, deadline: e.target.value || null })} />}
        </Field>
      </div>
      <Field label="Resumo" hint="Aparece na lista do Hub." error={errors.summary}>
        {(f) => <Textarea {...f} rows={2} value={v.summary} maxLength={300} onChange={(e) => setV({ ...v, summary: e.target.value })} />}
      </Field>
      <Field label="Descrição" optional error={errors.description}>
        {(f) => <Textarea {...f} rows={6} value={v.description} maxLength={5000} onChange={(e) => setV({ ...v, description: e.target.value })} />}
      </Field>
      <AudienceFields value={v} onChange={(a) => setV({ ...v, ...a })} partners={partners} />
      <Button type="submit" loading={busy}>
        {id ? "Salvar" : "Criar oportunidade"}
      </Button>
    </form>
  );
}

export function InterestDecision({ id }: { id: string }) {
  const { busy, run } = useSubmit();
  const decide = (status: "accepted" | "declined") => run(() => api(`/api/cms/alliance/interests/${id}`, { body: { status } }), status === "accepted" ? "Interesse aceito. A empresa foi avisada." : "Interesse recusado. A empresa foi avisada.");
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => decide("declined")}>
        Recusar
      </Button>
      <Button size="sm" disabled={busy} onClick={() => decide("accepted")}>
        Aceitar
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Comunicados                                                                 */
/* -------------------------------------------------------------------------- */

export type AnnouncementFormValue = AudienceValue & { title: string; body: string; important: boolean };
export const EMPTY_ANNOUNCEMENT: AnnouncementFormValue = { ...EVERYONE, title: "", body: "", important: false };

export function AnnouncementEditor({ id, initial, partners, onDone }: { id: string | null; initial: AnnouncementFormValue; partners: Option[]; onDone?: () => void }) {
  const { busy, errors, run } = useSubmit();
  const [v, setV] = useState(initial);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(() => api(id ? `/api/cms/alliance/announcements/${id}` : "/api/cms/alliance/announcements", { method: id ? "PUT" : "POST", body: v }), "Rascunho salvo. Publique quando estiver pronto.", () => {
      if (!id) setV(EMPTY_ANNOUNCEMENT);
      onDone?.();
    });
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Título" error={errors.title}>
        {(f) => <Input {...f} value={v.title} maxLength={120} onChange={(e) => setV({ ...v, title: e.target.value })} />}
      </Field>
      <Field label="Comunicado" error={errors.body}>
        {(f) => <Textarea {...f} rows={6} value={v.body} maxLength={5000} onChange={(e) => setV({ ...v, body: e.target.value })} />}
      </Field>
      <AudienceFields value={v} onChange={(a) => setV({ ...v, ...a })} partners={partners} />
      <Switch label="Importante" description="Além do aviso no Hub, vai por e-mail para as pessoas das empresas." checked={v.important} onChange={(important) => setV({ ...v, important })} />
      <Button type="submit" loading={busy}>
        {id ? "Salvar rascunho" : "Criar rascunho"}
      </Button>
    </form>
  );
}

export function AnnouncementActions({ id, status, title, initial, partners }: { id: string; status: string; title: string; initial: AnnouncementFormValue; partners: Option[] }) {
  const { busy, run } = useSubmit();
  const [confirm, setConfirm] = useState<"publish" | "archive" | null>(null);
  const [editing, setEditing] = useState(false);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setEditing(!editing)}>
              {editing ? "Fechar" : "Editar"}
            </Button>
            <Button size="sm" onClick={() => setConfirm("publish")}>
              Publicar
            </Button>
          </>
        )}
        {status !== "archived" && (
          <Button size="sm" variant="ghost" onClick={() => setConfirm("archive")}>
            Arquivar
          </Button>
        )}
      </div>
      {editing && (
        <div className="mt-4 rounded-md border border-zinc-200 p-4">
          <AnnouncementEditor id={id} initial={initial} partners={partners} onDone={() => setEditing(false)} />
        </div>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "publish" ? `Publicar "${title}"?` : `Arquivar "${title}"?`}
        description={confirm === "publish" ? `Vira aviso no Hub para as empresas do público escolhido${initial.important ? " e vai por e-mail" : ""}. Depois de publicado, não muda.` : "Sai da lista de avisos do Hub."}
        confirmLabel={confirm === "publish" ? "Publicar" : "Arquivar"}
        tone={confirm === "publish" ? "primary" : "danger"}
        loading={busy}
        onConfirm={() =>
          run(
            () => api<{ partners?: number; people?: number }>(`/api/cms/alliance/announcements/${id}/${confirm}`, { body: {} }),
            (r) => (confirm === "publish" ? `Publicado para ${r?.partners ?? 0} empresa(s), ${r?.people ?? 0} pessoa(s).` : "Comunicado arquivado."),
            () => setConfirm(null),
          )
        }
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Suporte e e-mails                                                           */
/* -------------------------------------------------------------------------- */

export function TicketReplyForm({ id, status, assignedTo, team }: { id: string; status: string; assignedTo: string | null; team: { id: string; name: string }[] }) {
  const { busy, errors, run } = useSubmit();
  const [body, setBody] = useState("");
  const [close, setClose] = useState(false);
  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => api(`/api/cms/alliance/tickets/${id}`, { body: { body, close } }), "Resposta enviada. A empresa foi avisada no Hub e por e-mail.", () => {
            setBody("");
            setClose(false);
          });
        }}
        noValidate
        className="space-y-3"
      >
        <Field label="Responder" error={errors.body}>
          {(f) => <Textarea {...f} rows={5} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />}
        </Field>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" className="size-4 accent-zinc-900" checked={close} onChange={(e) => setClose(e.target.checked)} /> Encerrar o chamado com esta resposta
        </label>
        <Button type="submit" loading={busy}>
          Enviar resposta
        </Button>
      </form>
      <div className="grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2">
        <Field label="Situação">
          {(f) => (
            <Select {...f} value={status} disabled={busy} onChange={(e) => run(() => api(`/api/cms/alliance/tickets/${id}/status`, { body: { status: e.target.value } }), "Situação atualizada.")}>
              {TICKET_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Responsável">
          {(f) => (
            <Select {...f} value={assignedTo ?? ""} disabled={busy} onChange={(e) => run(() => api(`/api/cms/alliance/tickets/${id}/status`, { body: { status, assignedTo: e.target.value || null } }), "Responsável atualizado.")}>
              <option value="">Ninguém</option>
              {team.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </div>
  );
}

export function RetryEmailButton({ id }: { id: string }) {
  const { busy, run } = useSubmit();
  return (
    <Button size="sm" variant="secondary" loading={busy} onClick={() => run(() => api<{ status: string }>(`/api/cms/alliance/emails/${id}/retry`, { body: {} }), (r) => (r.status === "sent" ? "E-mail reenviado." : "O envio falhou de novo. Confira a configuração do Resend."))}>
      Reenviar
    </Button>
  );
}
