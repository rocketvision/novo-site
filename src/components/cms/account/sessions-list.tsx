"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Badge } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { formatDateTime, relativeTime } from "@/lib/cms/format";

export type SessionRow = {
  id: string;
  device: string;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const others = sessions.filter((s) => !s.current).length;

  async function revoke(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      await api(`/api/cms/account/sessions/${id}`, { method: "DELETE" });
      toast.success("Sessão encerrada.");
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  async function revokeAll() {
    setBusy("all");
    try {
      const { revoked } = await api<{ revoked: number }>("/api/cms/account/sessions", { method: "DELETE" });
      toast.success(revoked === 1 ? "1 sessão encerrada." : `${revoked} sessões encerradas.`);
      setConfirmAll(false);
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <ul className="-my-3 divide-y divide-zinc-100">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <Monitor aria-hidden="true" className="size-4 shrink-0 text-zinc-400" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900">
                {s.device}
                {s.current && <Badge tone="green">Esta sessão</Badge>}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {s.ipAddress ?? "IP não registrado"} · ativa {relativeTime(s.lastSeenAt)} ·{" "}
                <span title={formatDateTime(s.createdAt)}>entrou {relativeTime(s.createdAt)}</span>
              </p>
            </div>
            {!s.current && (
              <Button variant="secondary" size="sm" onClick={() => revoke(s.id)} loading={busy === s.id} disabled={busy !== null}>
                Encerrar
              </Button>
            )}
          </li>
        ))}
      </ul>
      {others > 0 && (
        <div className="mt-5 flex justify-end border-t border-zinc-100 pt-4">
          <Button variant="secondary" size="sm" onClick={() => setConfirmAll(true)} disabled={busy !== null}>
            Encerrar as outras sessões
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmAll}
        title="Encerrar as outras sessões?"
        description={`${others === 1 ? "A outra sessão aberta será desconectada" : `As ${others} outras sessões abertas serão desconectadas`}. Esta sessão continua ativa.`}
        confirmLabel="Encerrar sessões"
        loading={busy === "all"}
        onConfirm={revokeAll}
        onClose={() => setConfirmAll(false)}
      />
    </>
  );
}
