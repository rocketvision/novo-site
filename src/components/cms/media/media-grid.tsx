"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MediaDTO } from "./types";

/** Miniatura com a proporção preservada (contain) sobre fundo neutro, para logos e screenshots não serem cortados. */
export function MediaThumb({ media, sizes = "200px", className }: { media: Pick<MediaDTO, "url" | "alt" | "blurDataUrl">; sizes?: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-zinc-100 [background-image:repeating-conic-gradient(#f4f4f5_0_25%,#fafafa_0_50%)] [background-size:16px_16px]", className)}>
      <Image
        src={media.url}
        alt={media.alt}
        fill
        sizes={sizes}
        className="object-contain"
        placeholder={media.blurDataUrl ? "blur" : "empty"}
        blurDataURL={media.blurDataUrl ?? undefined}
      />
    </div>
  );
}

export function MediaGrid({
  items,
  selectedId,
  onSelect,
  label,
}: {
  items: MediaDTO[];
  selectedId?: string | null;
  onSelect: (media: MediaDTO) => void;
  label: string;
}) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {items.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => onSelect(m)}
            aria-pressed={selectedId !== undefined ? selectedId === m.id : undefined}
            className={cn(
              "group block w-full overflow-hidden rounded-lg border bg-white text-left transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              selectedId === m.id ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm",
            )}
          >
            <MediaThumb media={m} className="aspect-[4/3] border-b border-zinc-100" sizes="(min-width: 1280px) 220px, (min-width: 768px) 25vw, 50vw" />
            <span className="block px-2.5 py-2">
              <span className="block truncate text-[13px] font-medium text-zinc-900">{m.filename}</span>
              <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-zinc-500">
                <span className="tabular-nums">
                  {m.width}×{m.height}
                </span>
                {!m.alt ? (
                  <span title="Sem texto alternativo" className="rounded bg-amber-50 px-1.5 py-px font-medium text-amber-800">
                    Sem alt
                  </span>
                ) : m.usageCount > 0 ? (
                  <span>Em uso</span>
                ) : null}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
