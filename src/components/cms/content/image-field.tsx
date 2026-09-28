"use client";

import { createContext, useContext, useState } from "react";
import Image from "next/image";
import { ImageIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Field, Input } from "@/components/cms/ui/field";
import { MediaPicker } from "@/components/cms/media/media-picker";
import type { MediaDTO } from "@/components/cms/media/types";
import { FALLBACK_IMAGES } from "@/content/media";
import type { ImageField as ImageValue } from "@/lib/content/schemas";

export type MediaPreview = Pick<MediaDTO, "id" | "url" | "alt" | "width" | "height" | "filename" | "blurDataUrl">;

/** Mídias conhecidas pelo formulário (as já usadas no conteúdo e as escolhidas agora). */
export const MediaContext = createContext<{
  media: Record<string, MediaPreview>;
  remember: (media: MediaPreview) => void;
  canUpload: boolean;
}>({ media: {}, remember: () => {}, canUpload: false });

export function ImageField({
  label,
  hint,
  minWidth,
  value,
  onChange,
  error,
  altError,
}: {
  label: string;
  hint?: string;
  /** Largura mínima recomendada para a posição da imagem no site. */
  minWidth?: number;
  value: ImageValue;
  onChange: (value: ImageValue) => void;
  error?: string;
  altError?: string;
}) {
  const { media, remember, canUpload } = useContext(MediaContext);
  const [picking, setPicking] = useState(false);

  const chosen = value.mediaId ? media[value.mediaId] : undefined;
  const original = value.fallback ? FALLBACK_IMAGES[value.fallback] : undefined;
  const preview = chosen ? { src: chosen.url, alt: chosen.alt, blur: chosen.blurDataUrl ?? undefined } : original ? { src: original.src, alt: original.alt, blur: undefined } : null;
  const defaultAlt = chosen?.alt || original?.alt || "";
  const lowRes = chosen && minWidth && chosen.width < minWidth;
  const noAlt = Boolean(chosen) && !value.alt && !chosen?.alt;

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-zinc-900">{label}</p>
      <div className="flex flex-col gap-4 rounded-md border border-zinc-200 bg-white p-3 sm:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded bg-zinc-100 sm:w-44">
          {preview ? (
            <Image
              src={preview.src}
              alt=""
              fill
              sizes="180px"
              className="object-cover"
              placeholder={preview.blur || typeof preview.src !== "string" ? "blur" : "empty"}
              blurDataURL={preview.blur}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <ImageIcon className="size-6" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-[13px] text-zinc-600">
            {chosen ? (
              <>
                <span className="font-medium text-zinc-900">{chosen.filename}</span>
                <span className="text-zinc-500">
                  {" "}
                  · {chosen.width}×{chosen.height}
                </span>
              </>
            ) : value.mediaId ? (
              <span className="text-red-600">A imagem escolhida não está mais na biblioteca.</span>
            ) : original ? (
              "Foto original do site"
            ) : (
              "Nenhuma imagem escolhida"
            )}
          </p>
          {lowRes && (
            <p className="text-[13px] text-amber-700">
              A imagem tem {chosen.width} px de largura. Nesta posição, o recomendado é pelo menos {minWidth} px para não perder nitidez.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>
              {value.mediaId || original ? "Trocar imagem" : "Escolher imagem"}
            </Button>
            {value.mediaId && original && (
              // O texto alternativo descrevia a imagem anterior: volta a usar o da foto original.
              <Button variant="ghost" size="sm" onClick={() => onChange({ ...value, mediaId: null, alt: "" })}>
                <RotateCcw className="size-3.5" /> Voltar para a foto original
              </Button>
            )}
          </div>
          <Field
            label="Texto alternativo"
            optional
            error={altError}
            hint={
              noAlt
                ? "A imagem está sem texto alternativo na biblioteca. Descreva o que aparece nela."
                : defaultAlt
                  ? `Vazio: usa "${defaultAlt.length > 70 ? `${defaultAlt.slice(0, 70)}...` : defaultAlt}"`
                  : "Descreva o que aparece na imagem."
            }
          >
            {(p) => <Input {...p} value={value.alt} onChange={(e) => onChange({ ...value, alt: e.target.value })} maxLength={200} />}
          </Field>
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
          // Imagem nova: o texto alternativo anterior descrevia outra foto. Vazio usa o da biblioteca.
          onChange({ ...value, mediaId: m.id, alt: "" });
        }}
      />
    </div>
  );
}
