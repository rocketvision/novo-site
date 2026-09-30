"use client";

import { useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import { RocketHover } from "@/components/ui/rocket-hover";
import { cn } from "@/lib/utils";

/**
 * Vídeo de abertura: o foguete decola uma vez e fica planando sobre a Terra.
 *
 * - Toca uma única vez, sem loop. Os últimos segundos estão em câmera lenta com desaceleração
 *   no próprio arquivo, então o foguete chega ao quadro final sem freada. Depois o vídeo fica
 *   parado no último quadro: o motor continua aceso, partículas descem pelo rastro e estrelas
 *   piscam (RocketHover), com o push-in lento de câmera (CSS) por baixo.
 * - A decolagem espera a abertura da página (preloader) terminar, para não acontecer escondida.
 *   Na navegação interna, sem abertura, começa na hora.
 * - Nunca recomeça: pausar fora da tela e voltar retoma de onde parou; depois do fim, fica no fim.
 *   Só um novo carregamento da página decola de novo.
 * - Ampliado com IA (Real-ESRGAN) a partir da fonte 720p, em três versões escolhidas pela tela:
 *   recorte vertical 3:4 (1080 × 1440) centrado no foguete para celulares e tablets em pé,
 *   1920 × 1080 para a maioria dos desktops e 2560 × 1440 para telas grandes ou de alta densidade.
 *   Cada uma em VP9 (menor, preferido) e H.264 (para quem não tem VP9).
 * - Por baixo, uma imagem otimizada: o primeiro quadro enquanto o vídeo carrega (a troca não se nota)
 *   ou o quadro final, com o foguete planando, quando não há vídeo (movimento reduzido, economia
 *   de dados, falha ou autoplay bloqueado).
 * - Tratamento de cor no próprio arquivo: pretos mais profundos, azul do motor mais vivo e nitidez leve.
 */

const PORTRAIT = "(orientation: portrait) and (max-width: 1024px)";
/** Telas largas, ou notebooks e monitores com densidade de pixels alta: vale a versão 1440p. */
const LARGE = "(min-width: 1921px), (min-width: 1280px) and (min-resolution: 1.5dppx)";

/** Economia de dados ligada ou conexão 2G: fica só a imagem. */
function prefersLiteMedia() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");
}

/** Resolve quando a abertura da página terminou (classe `intro-done`, ver IntroDone). */
function afterIntro(onDone: () => void) {
  const root = document.documentElement;
  if (root.classList.contains("intro-done")) {
    onDone();
    return () => {};
  }
  const observer = new MutationObserver(() => {
    if (!root.classList.contains("intro-done")) return;
    observer.disconnect();
    onDone();
  });
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Imagem com direção de arte: recorte vertical em celulares e tablets em pé. */
function Frame({ name }: { name: "poster" | "still" }) {
  const common = { alt: "", sizes: "100vw", loading: "eager", fetchPriority: "high" } as const;
  const {
    props: { srcSet: portraitSrcSet },
  } = getImageProps({ ...common, src: `/video/hero-liftoff-${name}-portrait.jpg`, width: 1080, height: 1440 });
  const {
    props: { srcSet, ...image },
  } = getImageProps({ ...common, src: `/video/hero-liftoff-${name}.jpg`, width: 2560, height: 1440 });
  return (
    <picture>
      <source media={PORTRAIT} srcSet={portraitSrcSet} />
      <img {...image} srcSet={srcSet} alt="" className="absolute inset-0 size-full object-cover" />
    </picture>
  );
}

export function RocketVideo({ play = true, still = false, className }: { play?: boolean; still?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [lite, setLite] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    // Detectado depois da hidratação: desmontar o <video> interrompe o download já iniciado.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de APIs do navegador
    if (prefersLiteMedia()) setLite(true);
    return afterIntro(() => setIntroDone(true));
  }, []);

  const showVideo = !still && !lite && !failed;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // O primeiro quadro pode ter chegado antes da hidratação, sem evento para ouvir.
    // (Uma falha antes da hidratação também passa sem aviso, mas o vídeo segue invisível sobre a imagem.)
    if (video.readyState >= 2) setReady(true);
    if (video.ended) setEnded(true);
    if (!play || !introDone) {
      video.pause();
      return;
    }
    // Depois do fim, o foguete fica planando: nunca decola de novo sem recarregar a página.
    if (video.ended) return;
    // Sem som é o que libera o autoplay; o React nem sempre aplica `muted` ao hidratar.
    video.muted = true;
    video.play().catch((error: unknown) => {
      // Autoplay bloqueado (ex.: modo de economia de energia): fica a imagem do foguete planando.
      if (error instanceof DOMException && error.name === "NotAllowedError") setFailed(true);
    });
  }, [play, introDone, showVideo]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-ink", className)} aria-hidden="true">
      {/* Câmera: um push-in lento e contínuo; depois da decolagem, é o que faz o foguete parecer planar. */}
      <div className="animate-push-in absolute inset-0">
        <Frame name={showVideo ? "poster" : "still"} />

        {showVideo && (
          <video
            ref={ref}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-out",
              ready ? "opacity-100" : "opacity-0",
            )}
            muted
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            preload="auto"
            tabIndex={-1}
            onLoadedData={() => setReady(true)}
            onEnded={() => setEnded(true)}
            onError={() => setFailed(true)}
          >
            <source src="/video/hero-liftoff-portrait.webm" type="video/webm" media={PORTRAIT} />
            <source src="/video/hero-liftoff-portrait.mp4" type="video/mp4" media={PORTRAIT} />
            <source src="/video/hero-liftoff-1440.webm" type="video/webm" media={LARGE} />
            <source src="/video/hero-liftoff-1440.mp4" type="video/mp4" media={LARGE} />
            <source src="/video/hero-liftoff.webm" type="video/webm" />
            {/* O erro de carregamento chega pela última fonte, não pelo <video>. */}
            <source src="/video/hero-liftoff.mp4" type="video/mp4" onError={() => setFailed(true)} />
          </video>
        )}

        {/* Depois da decolagem (ou direto, quando não há vídeo), a cena parada continua viva. */}
        {!still && <RocketHover active={ended || !showVideo} />}
      </div>
    </div>
  );
}
