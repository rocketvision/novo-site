"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; tone: "success" | "error"; message: string };
const ToastContext = createContext<(tone: Toast["tone"], message: string) => void>(() => {});

/** Avisos curtos no canto da tela, anunciados por leitores de tela (aria-live). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { id, tone, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-white px-3.5 py-3 text-sm shadow-lg",
              t.tone === "error" ? "border-red-200" : "border-zinc-200",
            )}
          >
            {t.tone === "error" ? (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-600" />
            ) : (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            )}
            <p className="flex-1 text-zinc-800">{t.message}</p>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
              className="text-zinc-400 hover:text-zinc-700"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  return { success: (m: string) => push("success", m), error: (m: string) => push("error", m) };
}
