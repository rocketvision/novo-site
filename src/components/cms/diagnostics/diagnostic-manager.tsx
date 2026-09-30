"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { STATUS_TONES } from "@/components/cms/diagnostics/status-badge";
import { api, ApiError } from "@/lib/cms/api";
import { DIAGNOSTIC_STATUSES, type DiagnosticStatus } from "@/lib/diagnostic";
import { cn } from "@/lib/utils";

/**
 * Painel de atendimento de um diagnóstico: a etapa (um clique muda e salva), as anotações da equipe,
 * o atalho para o WhatsApp com a mensagem pronta e a exclusão (com confirmação).
 */
export function DiagnosticManager({
  id,
  status: initialStatus,
  notes: initialNotes,
  whatsappHref,
  canManage,
  canDelete,
}: {
  id: string;
  status: DiagnosticStatus;
  notes: string;
  whatsappHref: string;
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [busy, setBusy] = useState<"status" | "notes" | "delete" | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function save(body: { status?: DiagnosticStatus; notes?: string }, kind: "status" | "notes") {
    setBusy(kind);
    try {
      const result = await api<{ status: DiagnosticStatus; notes: string }>(`/api/cms/diagnostics/${id}`, { method: "PATCH", body });
      setStatus(result.status);
      setSavedNotes(result.notes);
      toast.success(kind === "status" ? "Etapa atualizada." : "Anotações salvas.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      await api(`/api/cms/diagnostics/${id}`, { method: "DELETE" });
      toast.success("Diagnóstico excluído.");
      router.push("/cms/diagnosticos");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível excluir.");
      setBusy(null);
      setConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700">
        <MessageCircle className="size-4" aria-hidden="true" />
        Chamar no WhatsApp
      </a>

      <fieldset disabled={!canManage || busy !== null}>
        <legend className="text-sm font-medium text-zinc-900">Etapa</legend>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {DIAGNOSTIC_STATUSES.map((s) => {
            const on = s.key === status;
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() => !on && save({ status: s.key }, "status")}
                className={cn(
                  "rounded-md px-2.5 py-2 text-left text-xs font-medium ring-1 ring-inset transition-colors disabled:cursor-not-allowed",
                  on ? STATUS_TONES[s.tone] : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="notas" className="text-sm font-medium text-zinc-900">
          Anotações da equipe
        </label>
        <Textarea
          id="notas"
          rows={6}
          maxLength={5000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!canManage}
          placeholder="Ex.: conversamos no dia 10, quer começar pelo site e depois a loja."
          className="mt-2"
        />
        {canManage && (
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={() => save({ notes }, "notes")} disabled={notes === savedNotes} loading={busy === "notes"}>
              Salvar anotações
            </Button>
          </div>
        )}
      </div>

      {canDelete && (
        <>
          <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700">
            <Trash2 className="size-3.5" aria-hidden="true" />
            Excluir diagnóstico
          </button>
          <ConfirmDialog
            open={confirm}
            title="Excluir este diagnóstico?"
            description="As respostas e as anotações somem de vez. A exclusão fica registrada na auditoria."
            confirmLabel="Excluir"
            loading={busy === "delete"}
            onConfirm={remove}
            onClose={() => setConfirm(false)}
          />
        </>
      )}
    </div>
  );
}
