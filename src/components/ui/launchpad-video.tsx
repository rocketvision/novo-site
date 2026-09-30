"use client";

import { useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import { cn } from "@/lib/utils";

/**
 * Vídeo do convite final: o foguete na plataforma, motores acesos, pronto para decolar.
 *
 * Fecha a narrativa da página: a abertura mostra a decolagem; aqui, antes do formulário,
 * a contagem regressiva do próximo lançamento, o projeto de quem está lendo.
 *
 * - Os primeiros 1,75 s do lançamento (o foguete ainda na plataforma), ampliados com IA,
 *   em câmera lenta a 25% da velocidade. O loop é um dissolve da fumaça sobre ela mesma, sem emenda.
 * - Três versões, como na abertura: 2560 × 1440 (telas grandes ou retina), 1920 × 1080 e o
 *   recorte vertical 810 × 1080 centrado no foguete para celulares e tablets em pé.
 * - Só baixa e toca quando chega perto da tela; fora dela, pausa. Com `play` falso (movimento
 *   reduzido), fica a imagem do primeiro quadro.
 */

const PORTRAIT = "(orientation: portrait) and (max-width: 1024px)";
const LARGE = "(min-width: 1921px), (min-width: 1280px) and (min-resolution: 1.5dppx)";

export function LaunchpadVideo({ play = true, className }: { play?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "50% 0px" });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!play || !near) {
      video.pause();
      return;
    }
    // Com preload="none", o play() é o que dispara o download, só quando chega perto da tela.
    video.muted = true;
    video.play().catch(() => {});
  }, [play, near]);

  const common = { alt: "", sizes: "100vw" } as const;
  const {
    props: { srcSet: portraitSrcSet },
  } = getImageProps({ ...common, src: "/video/launchpad-poster-portrait.jpg", width: 1080, height: 1440 });
  const {
    props: { srcSet, ...image },
  } = getImageProps({ ...common, src: "/video/launchpad-poster.jpg", width: 2560, height: 1440 });

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-ink", className)} aria-hidden="true">
      <picture>
        <source media={PORTRAIT} srcSet={portraitSrcSet} />
        <img {...image} srcSet={srcSet} alt="" className="absolute inset-0 size-full object-cover" />
      </picture>
      <video
        ref={ref}
        className={cn("absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out", ready ? "opacity-100" : "opacity-0")}
        muted
        loop
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        preload="none"
        tabIndex={-1}
        onLoadedData={() => setReady(true)}
      >
        {play && (
          <>
            <source src="/video/launchpad-portrait.webm" type="video/webm" media={PORTRAIT} />
            <source src="/video/launchpad-portrait.mp4" type="video/mp4" media={PORTRAIT} />
            <source src="/video/launchpad-1440.webm" type="video/webm" media={LARGE} />
            <source src="/video/launchpad-1440.mp4" type="video/mp4" media={LARGE} />
            <source src="/video/launchpad.webm" type="video/webm" />
            <source src="/video/launchpad.mp4" type="video/mp4" />
          </>
        )}
      </video>
    </div>
  );
}
