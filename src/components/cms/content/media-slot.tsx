"use client";

import { useContext, useState } from "react";
import Image from "next/image";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { MediaPicker } from "@/components/cms/media/media-picker";
import { cn } from "@/lib/utils";
import { MediaContext } from "./image-field";

/**
 * Campo de uma imagem da biblioteca (sem foto original de reserva), usado nos projetos.
 * `aspect` só muda a miniatura: a imagem é exibida inteira (contain).
 */
export function MediaSlot({
  label,
  hint,
  value,
  onChange,
  error,
  optional,
  aspect = "aspect-[4/3]",
  readOnly,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (mediaId: string | null) => void;
  error?: string;
  optional?: boolean;
  aspect?: string;
  readOnly?: boolean;
}) {
  const { media, remember, canUpload } = useContext(MediaContext);
  const [picking, setPicking] = useState(false);
  const chosen = value ? media[value] : undefined;

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-zinc-900">
        {label}
        {optional && <span className="ml-1.5 font-normal text-zinc-500">Opcional</span>}
      </p>
      <div className={cn("flex items-center gap-3 rounded-md border bg-white p-2.5", error ? "border-red-500" : "border-zinc-200")}>
        <div className={cn("relative w-24 shrink-0 overflow-hidden rounded bg-zinc-100", aspect)}>
          {chosen ? (
            <Image src={chosen.url} alt="" fill sizes="96px" className="object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <ImageIcon aria-hidden="true" className="size-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-zinc-700">
            {chosen ? (
              <>
                {chosen.filename}
                <span className="text-zinc-500">
                  {" "}
                  · {chosen.width}×{chosen.height}
                </span>
              </>
            ) : value ? (
              <span className="text-red-600">Imagem não encontrada na biblioteca.</span>
            ) : (
              <span className="text-zinc-500">Nenhuma imagem</span>
            )}
          </p>
          {!readOnly && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>
                {value ? "Trocar" : "Escolher imagem"}
              </Button>
              {value && (
                <Button variant="ghost" size="sm" onClick={() => onChange(null)} aria-label={`Remover ${label.toLowerCase()}`}>
                  <X className="size-3.5" /> Remover
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {error && <p className="mt-1.5 text-[13px] text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-[13px] text-zinc-500">{hint}</p>}
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        canUpload={canUpload}
        title={`Escolher imagem: ${label}`}
        onPick={(m) => {
          remember(m);
          onChange(m.id);
        }}
      />
    </div>
  );
}
