"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";

/** Mensagem para a equipe Rocket na indicação e cancelamento (enquanto ainda não foi qualificada). */
export function ReferralActions({ id, canCancel }: { id: string; canCancel: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<null | "note" | "cancel">(null);
  const [error, setError] = useState<string | undefined>();

  async function send(kind: "note" | "cancel") {
    setBusy(kind);
    setError(undefined);
    try {
      await api(`/api/alliance/hub/referrals/${id}/${kind === "note" ? "notes" : "cancel"}`, { body: { note: kind === "note" ? note : reason } });
      toast.success(kind === "note" ? "Mensagem enviada." : "Indicação cancelada.");
      setNote("");
      setConfirm(false);
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      setError(err.fields?.note);
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Mensagem para a equipe Rocket Vision" error={error}>
        {(p) => <Textarea {...p} rows={3} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="Novidades sobre o cliente, melhor horário para contato..." />}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => send("note")} loading={busy === "note"} disabled={!note.trim()}>
          Enviar mensagem
        </Button>
        {canCancel && (
          <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
            Cancelar indicação
          </Button>
        )}
      </div>
      <ConfirmDialog open={confirm} title="Cancelar a indicação?" description="Ela sai do pipeline e a proteção da empresa deixa de valer." confirmLabel="Cancelar indicação" cancelLabel="Voltar" loading={busy === "cancel"} onConfirm={() => send("cancel")} onClose={() => setConfirm(false)}>
        <Field label="Motivo">{(p) => <Textarea {...p} rows={2} value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />}</Field>
      </ConfirmDialog>
    </div>
  );
}
