"use client";

import { useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import { cn } from "@/lib/utils";

/**
 * Vídeo de abertura: o lançamento do foguete (8 s, em loop), servido pelo próprio site.
 *
 * - Duas versões: 16:9 (1280 × 720) e um recorte vertical 3:4 (540 × 720) centrado no foguete,
 *   para celulares e tablets em pé baixarem menos e não perderem o assunto no `object-fit: cover`.
 *   Cada uma em VP9 (menor, preferido) e H.264 (para quem não tem VP9).
 * - O primeiro quadro fica por baixo como imagem otimizada: é o que aparece antes do vídeo,
 *   se ele falhar, com economia de dados ou com movimento reduzido. Como é o mesmo quadro
 *   do início do vídeo, a troca não se nota.
 * - `play` pausa e retoma sem desmontar: o vídeo nunca volta ao começo fora do próprio loop.
 * - `still`: só a imagem, sem baixar o vídeo (movimento reduzido).
 */

const PORTRAIT = "(orientation: portrait) and (max-width: 1024px)";

/** Economia de dados ligada ou conexão 2G: fica só a imagem. */
function prefersLiteMedia() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");
}

export function RocketVideo({ play = true, still = false, className }: { play?: boolean; still?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [lite, setLite] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Detectado depois da hidratação: desmontar o <video> interrompe o download já iniciado.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de APIs do navegador
    if (prefersLiteMedia()) setLite(true);
  }, []);

  const showVideo = !still && !lite && !failed;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // O primeiro quadro pode ter chegado antes da hidratação, sem evento para ouvir.
    // (Uma falha antes da hidratação também passa sem aviso, mas o vídeo segue invisível sobre o quadro.)
    if (video.readyState >= 2) setReady(true);
    if (!play) {
      video.pause();
      return;
    }
    // Alguns navegadores só iniciam o autoplay com um empurrão explícito.
    video.play().catch(() => {});
  }, [play, showVideo]);

  const common = { alt: "", sizes: "100vw", loading: "eager", fetchPriority: "high" } as const;
  const {
    props: { srcSet: portraitSrcSet },
  } = getImageProps({ ...common, src: "/video/hero-rocket-poster-portrait.jpg", width: 540, height: 720 });
  const {
    props: { srcSet, ...image },
  } = getImageProps({ ...common, src: "/video/hero-rocket-poster.jpg", width: 1280, height: 720 });

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-ink", className)} aria-hidden="true">
      <picture>
        <source media={PORTRAIT} srcSet={portraitSrcSet} />
        <img {...image} srcSet={srcSet} alt="" className="absolute inset-0 size-full object-cover" />
      </picture>

      {showVideo && (
        <video
          ref={ref}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-out",
            ready ? "opacity-100" : "opacity-0",
          )}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          preload="auto"
          tabIndex={-1}
          onLoadedData={() => setReady(true)}
          onError={() => setFailed(true)}
        >
          <source src="/video/hero-rocket-portrait.webm" type="video/webm" media={PORTRAIT} />
          <source src="/video/hero-rocket-portrait.mp4" type="video/mp4" media={PORTRAIT} />
          <source src="/video/hero-rocket.webm" type="video/webm" />
          {/* O erro de carregamento chega pela última fonte, não pelo <video>. */}
          <source src="/video/hero-rocket.mp4" type="video/mp4" onError={() => setFailed(true)} />
        </video>
      )}
    </div>
  );
}
