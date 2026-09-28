/**
 * Fotografia da landing page.
 *
 * Só duas seções usam fotografia: o hero (o negócio do cliente, sustentado no improviso)
 * e o convite final (a conversa). As demais têm visuais desenhados em código (src/components/visuals).
 *
 * Imports estáticos: o Next.js conhece as dimensões (sem layout shift),
 * gera placeholder de blur e serve AVIF/WebP redimensionado.
 * Origem e licença de cada foto: src/assets/images/CREDITS.md
 */

import cafeCounterNight from "@/assets/images/cafe-counter-night.jpg";
import twoChairsWindow from "@/assets/images/two-chairs-window.jpg";
import type { StaticImageData } from "next/image";
import type { FallbackKey } from "@/lib/content/schemas";

export type Photo = { src: StaticImageData; alt: string };

export const media = {
  hero: { src: cafeCounterNight, alt: "Mulher sozinha atrás do balcão de um pequeno café, à noite" },
  cta: { src: twoChairsWindow, alt: "Duas cadeiras e uma mesa pequena junto a uma janela iluminada pelo sol" },
} satisfies Record<string, Photo>;

/**
 * Fotos originais de direção de arte, usadas quando o CMS não define outra imagem.
 * As chaves são referenciadas pelo campo `fallback` das imagens de seção.
 */
export const FALLBACK_IMAGES: Record<FallbackKey, Photo> = {
  hero: media.hero,
  cta: media.cta,
};
