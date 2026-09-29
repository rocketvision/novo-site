import type { StaticImageData } from "next/image";
import type { ImageField, SectionContent, SectionKey } from "./schemas";

/**
 * Conteúdo pronto para renderizar: cada campo de imagem do CMS ({ mediaId, alt, fallback })
 * vira uma foto com `src` resolvido (arquivo da biblioteca ou foto original embutida).
 */
export type ResolvedImage = { src: string | StaticImageData; alt: string; blurDataURL?: string };

type Resolve<T> = T extends ImageField ? ResolvedImage | null : T extends object ? { [K in keyof T]: Resolve<T[K]> } : T;

export type Resolved<K extends SectionKey> = Resolve<SectionContent<K>>;

export type LandingContent = { [K in SectionKey]: Resolved<K> };
