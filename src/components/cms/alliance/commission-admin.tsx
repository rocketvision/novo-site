"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { api, ApiError } from "@/lib/cms/api";
import { COMMISSION_STATUSES, commissionKindLabel, MODALITIES, PAYOUT_METHODS, RULE_SCOPES, TIERS, type ModalityKey, type TierKey } from "@/lib/alliance/constants";
import { formatMoney, formatRate } from "@/lib/alliance/money";

type Option = { id: string; tradeName: string };

export type EntryRow = {
  id: string;
  partnerId: string;
  partnerName: string;
  kind: string;
  status: string;
  baseCents: number | null;
  rateBp: number | null;
  amountCents: number;
  reason: string;
  referralId: string | null;
  referralCode: string | null;
  companyName: string | null;
};

const fail = (toast: ReturnType<typeof useToast>, e: unknown) => toast.error((e as ApiError).message);
const today = () => new Date().toISOString().slice(0, 10);

/* -------------------------------------------------------------------------- */
/* Lançamentos: aprovar e cancelar em lote                                     */
/* -------------------------------------------------------------------------- */

export function EntriesTable({ entries }: { entries: EntryRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<"approve" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const selectable = entries.filter((e) => e.status === "pending" || e.status === "approved");
  const chosen = entries.filter((e) => selected.has(e.id));
  const total = chosen.reduce((a, e) => a + e.amountCents, 0);
  const canApprove = chosen.length > 0 && chosen.every((e) => e.status === "pending");
  const canCancel = chosen.length > 0 && chosen.every((e) => e.status === "pending" || e.status === "approved");

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  async function run() {
    if (!confirm) return;
    setBusy(true);
    try {
      await api("/api/cms/alliance/entries/actions", { body: { ids: [...selected], action: confirm, reason } });
      toast.success(confirm === "approve" ? `${chosen.length} lançamento(s) aprovados. Os parceiros foram avisados.` : `${chosen.length} lançamento(s) cancelados.`);
      setSelected(new Set());
      setConfirm(null);
      setReason("");
      router.refresh();
    } catch (e) {
      fail(toast, e);
    } finally {
      setBusy(false);
    }
  }

  if (entries.length === 0) return <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">Nenhum lançamento com esses filtros.</p>;

  return (
    <div>
      <div className="mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-zinc-600">{chosen.length > 0 ? `${chosen.length} selecionado(s) · ${formatMoney(total)}` : "Selecione lançamentos para aprovar ou cancelar."}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={!canCancel} onClick={() => setConfirm("cancel")}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!canApprove} onClick={() => setConfirm("approve")}>
            Aprovar
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[46rem] text-left text-[13px]">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  className="size-4 accent-zinc-900"
                  checked={selectable.length > 0 && selectable.every((e) => selected.has(e.id))}
                  onChange={(ev) => setSelected(ev.target.checked ? new Set(selectable.map((e) => e.id)) : new Set())}
                />
              </th>
              <th className="px-3 py-2 font-medium">Parceiro</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 text-right font-medium">Base</th>
              <th className="px-3 py-2 text-right font-medium">Taxa</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {entries.map((e) => {
              const can = e.status === "pending" || e.status === "approved";
              return (
                <tr key={e.id} className={selected.has(e.id) ? "bg-zinc-50" : undefined}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" aria-label={`Selecionar lançamento de ${e.partnerName}`} className="size-4 accent-zinc-900" disabled={!can} checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                  </td>
                  <td className="px-3 py-2.5 text-zinc-900">{e.partnerName}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-zinc-900">{commissionKindLabel(e.kind)}</span>
                    <span className="block text-xs text-zinc-500">
                      {e.referralId ? (
                        <a href={`/cms/alliance/indicacoes/${e.referralId}`} className="underline-offset-4 hover:underline">
                          {e.referralCode} · {e.companyName}
                        </a>
                      ) : (
                        e.reason
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{e.baseCents !== null ? formatMoney(e.baseCents) : "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{e.rateBp !== null ? formatRate(e.rateBp) : "—"}</td>
                  <td className={`px-3 py-2.5 text-right font-medium tabular-nums ${e.amountCents < 0 ? "text-red-700" : "text-zinc-900"}`}>{formatMoney(e.amountCents)}</td>
                  <td className="px-3 py-2.5">
                    <ToneBadge list={COMMISSION_STATUSES} value={e.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "approve" ? "Aprovar lançamentos?" : "Cancelar lançamentos?"}
        description={
          confirm === "approve"
            ? `${chosen.length} lançamento(s), total ${formatMoney(total)}. Aprovados, ficam disponíveis para pagamento e o parceiro é avisado.`
            : `${chosen.length} lançamento(s), total ${formatMoney(total)}. O cancelamento fica no histórico com o motivo; nada é apagado.`
        }
        confirmLabel={confirm === "approve" ? "Aprovar" : "Cancelar lançamentos"}
        cancelLabel="Voltar"
        tone={confirm === "approve" ? "primary" : "danger"}
        loading={busy}
        onConfirm={run}
        onClose={() => setConfirm(null)}
      >
        {confirm === "cancel" && (
          <Field label="Motivo">
            {(f) => <Textarea {...f} rows={2} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />}
          </Field>
        )}
      </ConfirmDialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ajuste manual                                                               */
/* -------------------------------------------------------------------------- */

export function AdjustmentForm({ partners }: { partners: Option[] }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ partnerId: "", amount: "", reason: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api("/api/cms/alliance/adjustments", { body: { ...v, referralId: null } });
      toast.success("Ajuste lançado, pendente de aprovação.");
      setV({ partnerId: v.partnerId, amount: "", reason: "" });
      router.refresh();
    } catch (err) {
      setErrors((err as ApiError).fields ?? {});
      fail(toast, err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Parceiro" error={errors.partnerId}>
        {(f) => (
          <Select {...f} value={v.partnerId} onChange={(e) => setV({ ...v, partnerId: e.target.value })}>
            <option value="">Escolha</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.tradeName}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Valor" hint="Negativo para descontar (ex.: -150,00)." error={errors.amount}>
        {(f) => <Input {...f} inputMode="decimal" placeholder="0,00" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />}
      </Field>
      <Field label="Motivo" hint="Aparece para o parceiro no extrato." error={errors.reason}>
        {(f) => <Textarea {...f} rows={2} value={v.reason} maxLength={500} onChange={(e) => setV({ ...v, reason: e.target.value })} />}
      </Field>
      <Button type="submit" loading={busy}>
        Lançar ajuste
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Pagamentos                                                                  */
/* -------------------------------------------------------------------------- */

export function PayoutForm({ entries }: { entries: EntryRow[] }) {
  const router = useRouter();
  const toast = useToast();
  // Uma chave por formulário: clique duplo ou reenvio após erro de rede não registra dois pagamentos.
  const [key, setKey] = useState(() => crypto.randomUUID());
  const partners = useMemo(() => [...new Map(entries.map((e) => [e.partnerId, e.partnerName])).entries()], [entries]);
  const [partnerId, setPartnerId] = useState(partners[0]?.[0] ?? "");
  const own = entries.filter((e) => e.partnerId === partnerId);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(own.map((e) => e.id)));
  const [v, setV] = useState({ paidOn: today(), method: PAYOUT_METHODS[0] as string, reference: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const total = own.filter((e) => selected.has(e.id)).reduce((a, e) => a + e.amountCents, 0);

  if (entries.length === 0) return <p className="text-sm text-zinc-500">Nenhum lançamento aprovado aguardando pagamento.</p>;

  function pick(id: string) {
    setPartnerId(id);
    setSelected(new Set(entries.filter((e) => e.partnerId === id).map((e) => e.id)));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const r = await api<{ amountCents: number; duplicate: boolean }>("/api/cms/alliance/payouts", { body: { partnerId, entryIds: [...selected], expectedTotalCents: total, idempotencyKey: key, ...v } });
      toast.success(r.duplicate ? "Este pagamento já estava registrado." : `Pagamento de ${formatMoney(r.amountCents)} registrado. O parceiro foi avisado.`);
      setKey(crypto.randomUUID());
      router.refresh();
    } catch (err) {
      setErrors((err as ApiError).fields ?? {});
      fail(toast, err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Parceiro">
        {(f) => (
          <Select {...f} value={partnerId} onChange={(e) => pick(e.target.value)}>
            {partners.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-zinc-900">Lançamentos aprovados</legend>
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
          {own.map((e) => (
            <li key={e.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13px]">
                <input
                  type="checkbox"
                  className="size-4 accent-zinc-900"
                  checked={selected.has(e.id)}
                  onChange={() => {
                    const n = new Set(selected);
                    if (n.has(e.id)) n.delete(e.id);
                    else n.add(e.id);
                    setSelected(n);
                  }}
                />
                <span className="min-w-0 flex-1 truncate">
                  {commissionKindLabel(e.kind)} · {e.referralCode ? `${e.referralCode} ${e.companyName}` : e.reason}
                </span>
                <span className={`tabular-nums ${e.amountCents < 0 ? "text-red-700" : ""}`}>{formatMoney(e.amountCents)}</span>
              </label>
            </li>
          ))}
        </ul>
        {errors.entryIds && <p className="mt-1 text-xs text-red-600">{errors.entryIds}</p>}
      </fieldset>
      <div className="flex items-baseline justify-between rounded-md bg-zinc-50 px-3 py-2.5">
        <span className="text-[13px] text-zinc-600">Total a pagar</span>
        <span className="text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data do pagamento" error={errors.paidOn}>
          {(f) => <Input {...f} type="date" max={today()} value={v.paidOn} onChange={(e) => setV({ ...v, paidOn: e.target.value })} />}
        </Field>
        <Field label="Forma" error={errors.method}>
          {(f) => (
            <Select {...f} value={v.method} onChange={(e) => setV({ ...v, method: e.target.value })}>
              {PAYOUT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Referência" optional hint="ID da transação ou comprovante." error={errors.reference}>
        {(f) => <Input {...f} value={v.reference} maxLength={120} onChange={(e) => setV({ ...v, reference: e.target.value })} />}
      </Field>
      <Field label="Observações" optional error={errors.notes}>
        {(f) => <Textarea {...f} rows={2} value={v.notes} maxLength={1000} onChange={(e) => setV({ ...v, notes: e.target.value })} />}
      </Field>
      <Button type="submit" loading={busy} disabled={selected.size === 0 || total <= 0} className="w-full">
        Registrar pagamento de {formatMoney(total)}
      </Button>
    </form>
  );
}

export function VoidPayoutButton({ id, amountCents }: { id: string; amountCents: number }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await api(`/api/cms/alliance/payouts/${id}/void`, { body: { reason } });
      toast.success("Pagamento anulado. Os lançamentos voltaram para aprovados.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      fail(toast, e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Anular
      </Button>
      <ConfirmDialog open={open} title="Anular este pagamento?" description={`Use só para pagamento registrado por engano (${formatMoney(amountCents)}). O registro fica no histórico e os lançamentos voltam para aprovados.`} confirmLabel="Anular pagamento" loading={busy} onConfirm={run} onClose={() => setOpen(false)}>
        <Field label="Motivo">
          {(f) => <Textarea {...f} rows={2} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </ConfirmDialog>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Regras                                                                      */
/* -------------------------------------------------------------------------- */

export type RuleFormValue = {
  name: string;
  partnerId: string | null;
  tierKey: TierKey | null;
  modalityKey: ModalityKey | null;
  scope: string;
  ratePercent: string;
  recurringMonths: number;
  validFrom: string;
  validTo: string | null;
  isPublic: boolean;
  notes: string;
};

export const EMPTY_RULE: RuleFormValue = { name: "", partnerId: null, tierKey: null, modalityKey: null, scope: "all", ratePercent: "", recurringMonths: 12, validFrom: new Date().toISOString().slice(0, 10), validTo: null, isPublic: false, notes: "" };

export function RuleForm({ id, initial, partners, onDone }: { id: string | null; initial: RuleFormValue; partners: Option[]; onDone?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api(id ? `/api/cms/alliance/rules/${id}` : "/api/cms/alliance/rules", { method: id ? "PUT" : "POST", body: v });
      toast.success(id ? "Regra atualizada." : "Regra criada, aguardando aprovação comercial.");
      if (!id) setV(EMPTY_RULE);
      onDone?.();
      router.refresh();
    } catch (err) {
      setErrors((err as ApiError).fields ?? {});
      fail(toast, err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Nome" error={errors.name}>
        {(f) => <Input {...f} value={v.name} maxLength={80} placeholder="Ex.: Pro · 2026" onChange={(e) => setV({ ...v, name: e.target.value })} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nível" optional error={errors.tierKey}>
          {(f) => (
            <Select {...f} value={v.tierKey ?? ""} onChange={(e) => setV({ ...v, tierKey: (e.target.value || null) as TierKey | null })}>
              <option value="">Todos</option>
              {(Object.keys(TIERS) as TierKey[]).map((k) => (
                <option key={k} value={k}>
                  {TIERS[k].name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Modalidade" optional error={errors.modalityKey}>
          {(f) => (
            <Select {...f} value={v.modalityKey ?? ""} onChange={(e) => setV({ ...v, modalityKey: (e.target.value || null) as ModalityKey | null })}>
              <option value="">Todas</option>
              {(Object.keys(MODALITIES) as ModalityKey[]).map((k) => (
                <option key={k} value={k}>
                  {MODALITIES[k].name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Parceiro específico" optional error={errors.partnerId}>
          {(f) => (
            <Select {...f} value={v.partnerId ?? ""} onChange={(e) => setV({ ...v, partnerId: e.target.value || null, isPublic: e.target.value ? false : v.isPublic })}>
              <option value="">Nenhum</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tradeName}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Percentual" hint="Sobre a receita líquida recebida." error={errors.ratePercent}>
          {(f) => <Input {...f} inputMode="decimal" placeholder="5" value={v.ratePercent} onChange={(e) => setV({ ...v, ratePercent: e.target.value })} />}
        </Field>
        <Field label="Aplica-se a" error={errors.scope}>
          {(f) => (
            <Select {...f} value={v.scope} onChange={(e) => setV({ ...v, scope: e.target.value })}>
              {RULE_SCOPES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Mensalidades comissionadas" hint="0 = nenhuma recorrência." error={errors.recurringMonths}>
          {(f) => <Input {...f} inputMode="numeric" value={String(v.recurringMonths)} onChange={(e) => setV({ ...v, recurringMonths: Number(e.target.value.replace(/\D/g, "") || 0) })} />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vigência: início" error={errors.validFrom}>
          {(f) => <Input {...f} type="date" value={v.validFrom} onChange={(e) => setV({ ...v, validFrom: e.target.value })} />}
        </Field>
        <Field label="Vigência: fim" optional error={errors.validTo}>
          {(f) => <Input {...f} type="date" value={v.validTo ?? ""} onChange={(e) => setV({ ...v, validTo: e.target.value || null })} />}
        </Field>
      </div>
      <Switch label="Mostrar no site" description="Só regras gerais por nível. O percentual aparece na seção de comissões se ela estiver configurada para exibir taxas." checked={v.isPublic} onChange={(isPublic) => setV({ ...v, isPublic })} />
      {errors.isPublic && <p className="text-xs text-red-600">{errors.isPublic}</p>}
      <Field label="Observações" optional error={errors.notes}>
        {(f) => <Textarea {...f} rows={2} value={v.notes} maxLength={1000} onChange={(e) => setV({ ...v, notes: e.target.value })} />}
      </Field>
      <Button type="submit" loading={busy}>
        {id ? "Salvar regra" : "Criar regra"}
      </Button>
    </form>
  );
}

export function RuleActions({ id, status, name, initial, partners }: { id: string; status: string; name: string; initial: RuleFormValue; partners: Option[] }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState<"approved" | "archived" | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!confirm) return;
    setBusy(true);
    try {
      await api(`/api/cms/alliance/rules/${id}/status`, { body: { status: confirm } });
      toast.success(confirm === "approved" ? "Regra aprovada. Passa a valer para recebimentos dentro da vigência." : "Regra arquivada.");
      setConfirm(null);
      router.refresh();
    } catch (e) {
      fail(toast, e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setEditing(!editing)}>
              {editing ? "Fechar edição" : "Editar"}
            </Button>
            <Button size="sm" onClick={() => setConfirm("approved")}>
              Aprovar
            </Button>
          </>
        )}
        {status !== "archived" && (
          <Button size="sm" variant="ghost" onClick={() => setConfirm("archived")}>
            Arquivar
          </Button>
        )}
      </div>
      {editing && (
        <div className="mt-4 rounded-md border border-zinc-200 p-4">
          <RuleForm id={id} initial={initial} partners={partners} onDone={() => setEditing(false)} />
        </div>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "approved" ? `Aprovar "${name}"?` : `Arquivar "${name}"?`}
        description={confirm === "approved" ? "Aprovação comercial: a regra passa a calcular comissões e não pode mais ser editada (para mudar, arquive e crie outra)." : "A regra deixa de valer para novos recebimentos. Comissões já calculadas não mudam."}
        confirmLabel={confirm === "approved" ? "Aprovar regra" : "Arquivar"}
        tone={confirm === "approved" ? "primary" : "danger"}
        loading={busy}
        onConfirm={run}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
