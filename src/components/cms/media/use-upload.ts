"use client";

import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "@/lib/cms/api";
import { precheck, type MediaDTO } from "./types";

export type UploadItem = { key: string; name: string; status: "queued" | "uploading" | "done" | "duplicate" | "error"; error?: string };

/**
 * Fila de envio: um arquivo por vez (respeita o rate limit e não satura a conexão),
 * com o estado de cada arquivo visível para a pessoa.
 */
export function useUpload(onUploaded: (media: MediaDTO, duplicate: boolean) => void, endpoint = "/api/cms/media") {
  const [items, setItems] = useState<UploadItem[]>([]);
  const running = useRef(false);
  const queue = useRef<{ key: string; file: File }[]>([]);

  const update = (key: string, patch: Partial<UploadItem>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length > 0) {
      const { key, file } = queue.current.shift()!;
      update(key, { status: "uploading" });
      try {
        const form = new FormData();
        form.append("file", file);
        const result = await api<{ media: MediaDTO; duplicate: boolean }>(endpoint, { formData: form });
        update(key, { status: result.duplicate ? "duplicate" : "done" });
        onUploaded(result.media, result.duplicate);
      } catch (e) {
        update(key, { status: "error", error: (e as ApiError).message });
      }
    }
    running.current = false;
  }, [onUploaded, endpoint]);

  const add = useCallback(
    (files: FileList | File[]) => {
      const next: UploadItem[] = [];
      for (const file of Array.from(files)) {
        const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
        const problem = precheck(file);
        next.push({ key, name: file.name, status: problem ? "error" : "queued", error: problem ?? undefined });
        if (!problem) queue.current.push({ key, file });
      }
      setItems((list) => [...next, ...list.filter((i) => i.status === "queued" || i.status === "uploading" || i.status === "error")]);
      void run();
    },
    [run],
  );

  const clear = useCallback(() => setItems((list) => list.filter((i) => i.status === "queued" || i.status === "uploading")), []);

  return { items, add, clear, busy: items.some((i) => i.status === "queued" || i.status === "uploading") };
}
