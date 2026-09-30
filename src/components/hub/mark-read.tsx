"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/cms/api";

/** Ao abrir a caixa de avisos, marca tudo como lido (o contador do sino zera). */
export function MarkRead({ unread }: { unread: number }) {
  const router = useRouter();
  useEffect(() => {
    if (unread === 0) return;
    const t = setTimeout(() => {
      void api("/api/alliance/hub/notifications", { body: {} }).then(() => router.refresh()).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [unread, router]);
  return null;
}
