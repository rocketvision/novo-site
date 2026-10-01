"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Field, Input, Textarea } from "@/components/cms/ui/field";
import { Panel } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { maskPhone } from "@/lib/diagnostic";

const SERVICES = ["Site", "Loja virtual", "Sistema sob medida", "Aplicativo", "Anúncios", "Outro"];

/** Nova indicação: dados da empresa, do contato e da necessidade. A duplicidade é conferida no servidor. */
export function ReferralForm({ protectionDays }: { protectionDays: number }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ companyName: "", companyWebsite: "", companyTaxId: "", contactName: "", contactRole: "", contactEmail: "", contactPhone: "", city: "", need: "", services: [] as string[], estimatedValue: "", consentConfirmed: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    setErrors((e) => (k in e ? Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)) : e));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const r = await api<{ id: string; code: string }>("/api/alliance/hub/referrals", { body: v });
      toast.success(`Indicação ${r.code} registrada e protegida.`);
      router.push(`/alliance/indicacoes/${r.id}`);
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.fields ?? {});
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Panel title="Empresa indicada">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nome da empresa" error={errors.companyName} className="sm:col-span-2">
            {(p) => <Input {...p} value={v.companyName} maxLength={120} required onChange={(e) => set("companyName", e.target.value)} />}
          </Field>
          <Field label="Site" optional error={errors.companyWebsite} hint="Ajuda a evitar indicações duplicadas.">
            {(p) => <Input {...p} value={v.companyWebsite} maxLength={300} placeholder="empresa.com.br" onChange={(e) => set("companyWebsite", e.target.value)} />}
          </Field>
          <Field label="CNPJ" optional error={errors.companyTaxId}>
            {(p) => <Input {...p} value={v.companyTaxId} maxLength={20} inputMode="numeric" onChange={(e) => set("companyTaxId", e.target.value)} />}
          </Field>
          <Field label="Cidade" optional error={errors.city}>
            {(p) => <Input {...p} value={v.city} maxLength={80} onChange={(e) => set("city", e.target.value)} />}
          </Field>
        </div>
      </Panel>
      <Panel title="Contato na empresa">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nome" error={errors.contactName}>
            {(p) => <Input {...p} value={v.contactName} maxLength={80} required onChange={(e) => set("contactName", e.target.value)} />}
          </Field>
          <Field label="Cargo" optional error={errors.contactRole}>
            {(p) => <Input {...p} value={v.contactRole} maxLength={60} onChange={(e) => set("contactRole", e.target.value)} />}
          </Field>
          <Field label="E-mail" error={errors.contactEmail}>
            {(p) => <Input {...p} type="email" value={v.contactEmail} maxLength={160} required onChange={(e) => set("contactEmail", e.target.value)} />}
          </Field>
          <Field label="Telefone" optional error={errors.contactPhone}>
            {(p) => <Input {...p} type="tel" value={v.contactPhone} maxLength={16} onChange={(e) => set("contactPhone", maskPhone(e.target.value))} />}
          </Field>
        </div>
      </Panel>
      <Panel title="Oportunidade">
        <div className="space-y-5">
          <Field label="O que o cliente precisa" error={errors.need} counter={{ value: v.need.length, max: 2000 }}>
            {(p) => <Textarea {...p} rows={5} value={v.need} maxLength={2000} required onChange={(e) => set("need", e.target.value)} />}
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-zinc-900">Soluções de interesse</legend>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => {
                const on = v.services.includes(s);
                return (
                  <label key={s} className={on ? "cursor-pointer rounded-full bg-zinc-900 px-3 py-1.5 text-[13px] text-white" : "cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-700 hover:border-zinc-300"}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => set("services", on ? v.services.filter((x) => x !== s) : [...v.services, s])} />
                    {s}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <Field label="Valor estimado" optional hint="Só uma referência. O valor da comissão sai do que a Rocket efetivamente receber." error={errors.estimatedValue}>
            {(p) => <Input {...p} value={v.estimatedValue} inputMode="decimal" placeholder="R$ 0,00" maxLength={20} className="max-w-48" onChange={(e) => set("estimatedValue", e.target.value)} />}
          </Field>
        </div>
      </Panel>
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <label className="flex items-start gap-3 text-[13px] text-zinc-700">
          <input type="checkbox" className="mt-0.5 size-4 accent-zinc-900" checked={v.consentConfirmed} onChange={(e) => set("consentConfirmed", e.target.checked)} aria-invalid={errors.consentConfirmed ? true : undefined} />
          <span>Confirmo que o cliente sabe da indicação e autorizou o contato da Rocket Vision.</span>
        </label>
        {errors.consentConfirmed && <p className="mt-2 text-[13px] text-red-600">{errors.consentConfirmed}</p>}
        <p className="mt-4 flex items-start gap-2 text-[13px] text-zinc-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#2c9df5]" aria-hidden="true" />
          Registrada aqui primeiro, a indicação fica protegida no nome da sua empresa por {protectionDays} dias enquanto estiver em andamento.
        </p>
        <Button type="submit" loading={busy} className="mt-5">
          Registrar indicação
        </Button>
      </div>
    </form>
  );
}
