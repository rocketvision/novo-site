/**
 * Fotografia da landing page.
 *
 * Direção "Ofício": quatro fotografias da mesma família de luz (baixa, quente, fundo escuro),
 * escolhidas por associação de conceito. As demais seções usam composições desenhadas
 * a partir da própria copy (src/components/visuals).
 *
 * Imports estáticos: o Next.js conhece as dimensões (sem layout shift),
 * gera placeholder de blur e serve AVIF/WebP redimensionado.
 * Origem e licença de cada foto: src/assets/images/CREDITS.md
 */

import cafeOwnerPaperwork from "@/assets/images/cafe-owner-paperwork.jpg";
import violinMakerHands from "@/assets/images/violin-maker-hands.jpg";
import concreteStairsLight from "@/assets/images/concrete-stairs-light.jpg";
import bistroTableForTwo from "@/assets/images/bistro-table-for-two.jpg";
import type { StaticImageData } from "next/image";
import type { FallbackKey } from "@/lib/content/schemas";

export type Photo = { src: StaticImageData; alt: string };

export const media = {
  hero: {
    src: cafeOwnerPaperwork,
    alt: "Dono de café sentado sozinho à mesa do salão, à noite, com a cabeça apoiada na mão, preenchendo papéis",
  },
  differentials: {
    src: violinMakerHands,
    alt: "Mãos de um luthier ajustando a lateral curva de um violino em construção, entre aparas de madeira na bancada",
  },
  workflow: {
    src: concreteStairsLight,
    alt: "Escadaria de concreto aparente com corrimão, subindo em direção a uma parede iluminada pelo sol",
  },
  cta: {
    src: bistroTableForTwo,
    alt: "Mesa redonda com duas cadeiras frente a frente junto a um muro de pedra, à noite",
  },
} satisfies Record<string, Photo>;

/**
 * Fotos originais de direção de arte, usadas quando o CMS não define outra imagem.
 * As chaves são referenciadas pelo campo `fallback` das imagens de seção.
 */
export const FALLBACK_IMAGES: Record<FallbackKey, Photo> = media;
