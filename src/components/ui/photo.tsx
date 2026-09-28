import Image from "next/image";
import type { ResolvedImage } from "@/lib/content/resolved";
import { cn } from "@/lib/utils";

type PhotoProps = {
  /** Foto original embutida (import estático) ou imagem enviada pelo CMS (URL). */
  photo: ResolvedImage;
  /** Largura renderizada, para o navegador baixar só o tamanho necessário. */
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Foto decorativa: o conteúdo já está no texto ao redor. */
  decorative?: boolean;
};

/** Fotografia que preenche o contêiner pai (que precisa ser relative). */
export function Photo({ photo, sizes, className, priority, decorative }: PhotoProps) {
  // Import estático já traz o blur; imagem do CMS traz o blur gerado no upload.
  const hasBlur = typeof photo.src !== "string" || Boolean(photo.blurDataURL);
  return (
    <Image
      src={photo.src}
      alt={decorative ? "" : photo.alt}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={hasBlur ? "blur" : "empty"}
      blurDataURL={photo.blurDataURL}
      quality={80}
      className={cn("object-cover", className)}
    />
  );
}
