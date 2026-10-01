"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import type { ProgramSettings } from "@/lib/alliance/validation";

function useSave() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function save(path: string, body: unknown, ok: string) {
    setBusy(true);
    setErrors({});
    try {
      await api(path, { method: "PUT", body });
      toast.success(ok);
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      // Erros de campo chegam como "data.protectionDays" quando o corpo tem envelope.
      setErrors(Object.fromEntries(Object.entries(err.fields ?? {}).map(([k, v]) => [k.replace(/^data\./, ""), v])));
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, errors, save };
}

export function ProgramSettingsForm({ initial, version }: { initial: ProgramSettings; version: number }) {
  const { busy, errors, save } = useSave();
  const [v, setV] = useState(initial);
  const num = (s: string) => Number(s.replace(/\D/g, "") || 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save("/api/cms/alliance/settings", { data: v, version }, "Configurações salvas.");
      }}
      noValidate
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Proteção da indicação (dias)" hint="Tempo em que a empresa indicada fica reservada para o parceiro que registrou primeiro." error={errors.protectionDays}>
          {(f) => <Input {...f} inputMode="numeric" value={String(v.protectionDays)} onChange={(e) => setV({ ...v, protectionDays: num(e.target.value) })} />}
        </Field>
        <Field label="Mensalidades comissionadas (padrão)" hint="Sugestão para novas regras. Cada regra define o próprio número." error={errors.defaultRecurringMonths}>
          {(f) => <Input {...f} inputMode="numeric" value={String(v.defaultRecurringMonths)} onChange={(e) => setV({ ...v, defaultRecurringMonths: num(e.target.value) })} />}
        </Field>
        <Field label="E-mail de avisos da equipe" optional hint="Recebe novas candidaturas, indicações, pedidos de alteração e chamados." error={errors.notifyEmail}>
          {(f) => <Input {...f} type="email" value={v.notifyEmail} onChange={(e) => setV({ ...v, notifyEmail: e.target.value })} />}
        </Field>
        <Field label="E-mail de contato do programa" optional hint="Mostrado no Hub." error={errors.supportEmail}>
          {(f) => <Input {...f} type="email" value={v.supportEmail} onChange={(e) => setV({ ...v, supportEmail: e.target.value })} />}
        </Field>
      </div>
      <Field label="Condições de pagamento" optional hint="Mostradas aos parceiros na área de ganhos." error={errors.paymentTerms}>
        {(f) => <Textarea {...f} rows={3} value={v.paymentTerms} maxLength={600} onChange={(e) => setV({ ...v, paymentTerms: e.target.value })} />}
      </Field>
      <Button type="submit" loading={busy}>
        Salvar configurações
      </Button>
    </form>
  );
}

export function ModalityForm({ modalityKey, initial }: { modalityKey: string; initial: { name: string; description: string; isActive: boolean } }) {
  const { busy, errors, save } = useSave();
  const [v, setV] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(`/api/cms/alliance/modalities/${modalityKey}`, v, "Modalidade salva. O site foi atualizado.");
      }}
      noValidate
      className="space-y-3"
    >
      <Field label="Nome" error={errors.name}>
        {(f) => <Input {...f} value={v.name} maxLength={60} onChange={(e) => setV({ ...v, name: e.target.value })} />}
      </Field>
      <Field label="Descrição" error={errors.description}>
        {(f) => <Textarea {...f} rows={3} value={v.description} maxLength={800} onChange={(e) => setV({ ...v, description: e.target.value })} />}
      </Field>
      <Switch label="Aceitando candidaturas" description="Desligada: some do site e do formulário. Parceiros atuais continuam." checked={v.isActive} onChange={(isActive) => setV({ ...v, isActive })} />
      <Button type="submit" size="sm" loading={busy}>
        Salvar
      </Button>
    </form>
  );
}

export function TierForm({ tierKey, initial }: { tierKey: string; initial: { name: string; label: string; description: string; benefits: string[] } }) {
  const { busy, errors, save } = useSave();
  const [v, setV] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(`/api/cms/alliance/tiers/${tierKey}`, { ...v, benefits: v.benefits.filter((b) => b.trim()) }, "Nível salvo. O site foi atualizado.");
      }}
      noValidate
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome" error={errors.name}>
          {(f) => <Input {...f} value={v.name} maxLength={60} onChange={(e) => setV({ ...v, name: e.target.value })} />}
        </Field>
        <Field label="Rótulo" optional error={errors.label}>
          {(f) => <Input {...f} value={v.label} maxLength={60} onChange={(e) => setV({ ...v, label: e.target.value })} />}
        </Field>
      </div>
      <Field label="Descrição" error={errors.description}>
        {(f) => <Textarea {...f} rows={3} value={v.description} maxLength={800} onChange={(e) => setV({ ...v, description: e.target.value })} />}
      </Field>
      <fieldset>
        <legend className="text-[13px] font-medium text-zinc-900">Benefícios</legend>
        <ul className="mt-1.5 space-y-2">
          {v.benefits.map((b, i) => (
            <li key={i} className="flex gap-2">
              <Input aria-label={`Benefício ${i + 1}`} value={b} maxLength={120} onChange={(e) => setV({ ...v, benefits: v.benefits.map((x, j) => (j === i ? e.target.value : x)) })} />
              <Button size="sm" variant="ghost" aria-label={`Remover benefício ${i + 1}`} disabled={v.benefits.length <= 1} onClick={() => setV({ ...v, benefits: v.benefits.filter((_, j) => j !== i) })}>
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        {errors.benefits && <p className="mt-1 text-xs text-red-600">{errors.benefits}</p>}
        {v.benefits.length < 10 && (
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setV({ ...v, benefits: [...v.benefits, ""] })}>
            <Plus className="size-4" aria-hidden="true" /> Benefício
          </Button>
        )}
      </fieldset>
      <Button type="submit" size="sm" loading={busy}>
        Salvar
      </Button>
    </form>
  );
}
