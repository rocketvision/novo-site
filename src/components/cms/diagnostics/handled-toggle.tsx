"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { api, ApiError } from "@/lib/cms/api";
import { cn } from "@/lib/utils";

/** Marca o diagnóstico como respondido (ou volta para pendente). */
export function HandledToggle({ id, handled }: { id: string; handled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/cms/diagnostics/${id}`, { method: "PATCH", body: { handled: !handled } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium ring-1 ring-inset transition-colors disabled:opacity-60",
          handled ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100" : "bg-white text-zinc-700 ring-zinc-300 hover:bg-zinc-50",
        )}
      >
        <Check className="size-3.5" aria-hidden="true" />
        {handled ? "Respondido" : "Marcar como respondido"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
