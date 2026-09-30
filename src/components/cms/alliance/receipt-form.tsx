"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input, Select, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { formatMoney, formatRate } from "@/lib/alliance/money";

/**
 * Registro de recebimento (ou reembolso) de uma indicação ganha. A comissão é calculada no servidor
 * pela regra vigente; a tela só mostra o resultado.
 */
export function ReceiptForm({ referralId, receipts }: { referralId: string; receipts: { id: string; label: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState({ kind: "one_time", installmentNumber: "", amount: "", receivedOn: today, refundOf: "", description: "", externalRef: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const r = await api<{ entry: { amountCents: number; rateBp: number | null } | null; note: string }>("/api/cms/alliance/receipts", {
        body: { referralId, kind: v.kind, installmentNumber: v.kind === "recurring" ? Number(v.installmentNumber) || null : null, amount: v.amount, receivedOn: v.receivedOn, refundOf: v.kind === "refund" ? v.refundOf || null : null, description: v.description, externalRef: v.externalRef },
      });
      toast.success(r.entry ? `Registrado. Lançamento de ${formatMoney(r.entry.amountCents)}${r.entry.rateBp !== null ? ` (${formatRate(r.entry.rateBp)})` : ""} pendente de aprovação.` : `Registrado. ${r.note}`);
      setV({ ...v, amount: "", installmentNumber: "", description: "", externalRef: "" });
      router.refresh();
    } catch (err) {
      setErrors((err as ApiError).fields ?? {});
      toast.error((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" error={errors.kind}>
          {(f) => (
            <Select {...f} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
              <option value="one_time">Pagamento de projeto</option>
              <option value="recurring">Mensalidade</option>
              {receipts.length > 0 && <option value="refund">Reembolso</option>}
            </Select>
          )}
        </Field>
        {v.kind === "recurring" && (
          <Field label="Nº da mensalidade" error={errors.installmentNumber}>
            {(f) => <Input {...f} inputMode="numeric" value={v.installmentNumber} onChange={(e) => setV({ ...v, installmentNumber: e.target.value.replace(/\D/g, "") })} />}
          </Field>
        )}
        {v.kind === "refund" && (
          <Field label="Recebimento reembolsado" error={errors.refundOf}>
            {(f) => (
              <Select {...f} value={v.refundOf} onChange={(e) => setV({ ...v, refundOf: e.target.value })}>
                <option value="">Escolha</option>
                {receipts.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label={v.kind === "refund" ? "Valor reembolsado" : "Valor líquido recebido"} error={errors.amount} hint="Receita líquida elegível, conforme o termo.">
          {(f) => <Input {...f} inputMode="decimal" placeholder="0,00" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />}
        </Field>
        <Field label="Data" error={errors.receivedOn}>
          {(f) => <Input {...f} type="date" value={v.receivedOn} max={today} onChange={(e) => setV({ ...v, receivedOn: e.target.value })} />}
        </Field>
        <Field label="Referência" optional hint="Nota fiscal ou ID do pagamento. Impede registro em dobro." error={errors.externalRef}>
          {(f) => <Input {...f} value={v.externalRef} maxLength={120} onChange={(e) => setV({ ...v, externalRef: e.target.value })} />}
        </Field>
      </div>
      <Field label="Descrição" optional error={errors.description}>
        {(f) => <Textarea {...f} rows={2} value={v.description} maxLength={300} onChange={(e) => setV({ ...v, description: e.target.value })} />}
      </Field>
      <Button type="submit" loading={busy}>
        Registrar
      </Button>
    </form>
  );
}
