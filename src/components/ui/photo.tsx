import Image from "next/image";
import type { Photo as PhotoData } from "@/content/media";
import { cn } from "@/lib/utils";

type PhotoProps = {
  photo: PhotoData;
  /** Largura renderizada, para o navegador baixar só o tamanho necessário. */
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Foto decorativa: o conteúdo já está no texto ao redor. */
  decorative?: boolean;
};

/** Fotografia que preenche o contêiner pai (que precisa ser relative). */
export function Photo({ photo, sizes, className, priority, decorative }: PhotoProps) {
  return (
    <Image
      src={photo.src}
      alt={decorative ? "" : photo.alt}
      fill
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      quality={80}
      className={cn("object-cover", className)}
    />
  );
}
