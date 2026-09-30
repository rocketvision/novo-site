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
 *   ou o quadro final, com o foguete planando, se o vídeo falhar ou o autoplay for bloqueado.
 * - Sem "modo leve": toca em qualquer conexão, inclusive com economia de dados ligada.
 * - Toca também com "reduzir movimento" ativo (escolha da Rocket); nesse caso, `calm` desliga a
 *   paralaxe e a interação com o mouse. Se o navegador bloquear o autoplay (ex.: modo de pouca
 *   energia do iPhone), fica o foguete planando e o vídeo decola no primeiro toque ou clique.
 * - Com mouse, a cena inteira tem uma paralaxe discreta, de poucos pixels, seguindo o cursor.
 * - Tratamento de cor no próprio arquivo: pretos mais profundos, azul do motor mais vivo e nitidez leve.
 */

const PORTRAIT = "(orientation: portrait) and (max-width: 1024px)";
/** Telas largas, ou notebooks e monitores com densidade de pixels alta: vale a versão 1440p. */
const LARGE = "(min-width: 1921px), (min-width: 1280px) and (min-resolution: 1.5dppx)";

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

/** Tenta de novo no primeiro gesto do visitante: é o que libera o vídeo quando o autoplay foi bloqueado. */
function onFirstGesture(run: () => void) {
  const events = ["pointerdown", "touchend", "keydown", "click"] as const;
  const handler = () => {
    events.forEach((e) => window.removeEventListener(e, handler));
    run();
  };
  events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
  return () => events.forEach((e) => window.removeEventListener(e, handler));
}

export function RocketVideo({ play = true, calm = false, className }: { play?: boolean; calm?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [ended, setEnded] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => afterIntro(() => setIntroDone(true)), []);

  // Sem "modo leve": o vídeo aparece em qualquer conexão; só some se não carregar.
  const showVideo = !failed;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // O primeiro quadro pode ter chegado antes da hidratação, sem evento para ouvir.
    // (Uma falha antes da hidratação também passa sem aviso, mas o vídeo segue invisível sobre a imagem.)
    if (video.readyState >= 2) setReady(true);
    if (video.ended) setEnded(true);
    // O `autoPlay` do HTML começa a tocar antes do JavaScript (garantia caso ele falhe);
    // com o JavaScript no ar, a decolagem volta ao início e espera a abertura terminar.
    if (!introDone) {
      video.pause();
      if (!video.ended && video.currentTime < 3) video.currentTime = 0;
      return;
    }
    if (!play) {
      video.pause();
      return;
    }
    // Depois do fim, o foguete fica planando: nunca decola de novo sem recarregar a página.
    if (video.ended) return;
    // Sem som é o que libera o autoplay; o React nem sempre aplica `muted` ao hidratar.
    video.muted = true;
    let cancelGesture = () => {};
    video.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "NotAllowedError")) return;
      // Autoplay bloqueado: mostra o foguete planando e decola no primeiro toque ou clique.
      setBlocked(true);
      cancelGesture = onFirstGesture(() => {
        video
          .play()
          .then(() => setBlocked(false))
          .catch(() => {});
      });
    });
    return () => cancelGesture();
  }, [play, introDone, showVideo]);

  // Paralaxe: a cena desliza alguns pixels na direção oposta ao cursor, com inércia.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || calm || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;
    const step = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      // Zoom só o bastante para o deslocamento nunca mostrar a borda, crescendo junto (sem salto).
      const zoom = 1.002 + Math.max((32 * Math.abs(current.x)) / scene.clientWidth, (20 * Math.abs(current.y)) / scene.clientHeight);
      scene.style.transform = `translate3d(${(-current.x * 16).toFixed(2)}px, ${(-current.y * 10).toFixed(2)}px, 0) scale(${zoom.toFixed(4)})`;
      raf = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.001 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onMove = (event: PointerEvent) => {
      target.x = event.clientX / window.innerWidth - 0.5;
      target.y = event.clientY / window.innerHeight - 0.5;
      kick();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [calm]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-ink", className)} aria-hidden="true">
      <div ref={sceneRef} className="absolute inset-0 will-change-transform">
        {/* Câmera: um push-in lento e contínuo; depois da decolagem, é o que faz o foguete parecer planar. */}
        <div className="animate-push-in absolute inset-0">
          <Frame name={showVideo && !blocked ? "poster" : "still"} />

          {showVideo && (
            <video
              ref={ref}
              className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-out",
                ready && !blocked ? "opacity-100" : "opacity-0",
              )}
              autoPlay
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
          <RocketHover active={ended || blocked || !showVideo} interactive={!calm} />
        </div>
      </div>
    </div>
  );
}
