"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { REFERRAL_TRANSITIONS, referralStatusLabel, type ReferralStatus } from "@/lib/alliance/constants";
import { formatMoney } from "@/lib/alliance/money";

type Props = {
  id: string;
  version: number;
  status: ReferralStatus;
  ownerUserId: string | null;
  dealValueCents: number | null;
  lostReason: string;
  internalNotes: string;
  partnerId: string;
  owners: { id: string; name: string }[];
  partners: { id: string; tradeName: string }[];
  canEdit: boolean;
};

/** Gestão da indicação pela equipe: etapa, responsável, valor, mensagens e atribuição. */
export function ReferralManager(p: Props) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<ReferralStatus>(p.status);
  const [owner, setOwner] = useState(p.ownerUserId ?? "");
  const [deal, setDeal] = useState(p.dealValueCents !== null ? formatMoney(p.dealValueCents).replace("R$ ", "") : "");
  const [lost, setLost] = useState(p.lostReason);
  const [note, setNote] = useState("");
  const [visible, setVisible] = useState(true);
  const [internal, setInternal] = useState(p.internalNotes);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [extend, setExtend] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const next = REFERRAL_TRANSITIONS[p.status];

  if (!p.canEdit) return <p className="text-[13px] text-zinc-500">Você pode ver esta indicação, mas não gerenciá-la.</p>;

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      await api(`/api/cms/alliance/referrals/${p.id}`, {
        method: "PATCH",
        body: {
          version: p.version,
          ...(status !== p.status && { status }),
          ...(owner !== (p.ownerUserId ?? "") && { ownerUserId: owner || null }),
          ...(deal !== (p.dealValueCents !== null ? formatMoney(p.dealValueCents).replace("R$ ", "") : "") && { dealValue: deal }),
          ...(lost !== p.lostReason && { lostReason: lost }),
          ...(internal !== p.internalNotes && { internalNotes: internal }),
          ...(note.trim() && { note, noteVisibleToPartner: visible }),
          ...(reassignTo && { reassignTo, reassignReason }),
          ...(extend && { extendProtectionDays: Number(extend) }),
        },
      });
      toast.success(status !== p.status ? `Indicação movida para ${referralStatusLabel(status)}. O parceiro foi avisado.` : "Indicação atualizada.");
      setNote("");
      setReassignTo("");
      setExtend("");
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.fields ?? {});
      toast.error(err.status === 409 && err.code === "stale" ? "Outra pessoa alterou esta indicação. Recarregue a página." : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Etapa" error={errors.status}>
        {(f) => (
          <Select {...f} value={status} onChange={(e) => setStatus(e.target.value as ReferralStatus)}>
            <option value={p.status}>{referralStatusLabel(p.status)} (atual)</option>
            {next.map((s) => (
              <option key={s} value={s}>
                → {referralStatusLabel(s)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {(status === "won" || p.status === "won") && (
        <Field label="Valor do contrato" optional hint="Usado só na estimativa de comissão prevista do parceiro." error={errors.dealValue}>
          {(f) => <Input {...f} value={deal} inputMode="decimal" placeholder="0,00" onChange={(e) => setDeal(e.target.value)} />}
        </Field>
      )}
      {(status === "lost" || p.status === "lost") && (
        <Field label="Motivo da perda" error={errors.lostReason}>
          {(f) => <Input {...f} value={lost} maxLength={500} onChange={(e) => setLost(e.target.value)} />}
        </Field>
      )}
      <Field label="Responsável na Rocket" error={errors.ownerUserId}>
        {(f) => (
          <Select {...f} value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Sem responsável</option>
            {p.owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Mensagem" optional error={errors.note}>
        {(f) => <Textarea {...f} rows={3} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      <Switch label="Visível para o parceiro" description="Desligado: fica só no histórico interno." checked={visible} onChange={setVisible} />
      <Field label="Anotações internas" optional error={errors.internalNotes}>
        {(f) => <Textarea {...f} rows={3} value={internal} maxLength={4000} onChange={(e) => setInternal(e.target.value)} />}
      </Field>
      <details className="rounded-md border border-zinc-200 p-3">
        <summary className="cursor-pointer text-[13px] font-medium text-zinc-700">Atribuição e proteção</summary>
        <div className="mt-3 space-y-3">
          <Field label="Estender a proteção" optional>
            {(f) => (
              <Select {...f} value={extend} onChange={(e) => setExtend(e.target.value)}>
                <option value="">Não estender</option>
                {[15, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    + {d} dias
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Reatribuir a outro parceiro" optional error={errors.reassignTo}>
            {(f) => (
              <Select {...f} value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                <option value="">Manter</option>
                {p.partners.filter((x) => x.id !== p.partnerId).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.tradeName}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {reassignTo && (
            <Field label="Justificativa (interna)" error={errors.reassignReason}>
              {(f) => <Textarea {...f} rows={2} value={reassignReason} maxLength={500} onChange={(e) => setReassignReason(e.target.value)} />}
            </Field>
          )}
        </div>
      </details>
      <Button onClick={save} loading={busy} className="w-full">
        Salvar
      </Button>
    </div>
  );
}
