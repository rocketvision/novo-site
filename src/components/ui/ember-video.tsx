"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * O vídeo em brasa da Rocket (abertura e convite final), servido pelo próprio site.
 *
 * Aparece desde o primeiro instante: o poster é o primeiro quadro, então não há salto
 * quando ele começa a tocar. (Não esperamos o evento canplay: ele pode disparar antes
 * da hidratação e se perder.)
 *
 * - `play`: controla a reprodução (falso com movimento reduzido ou fora de cena).
 * - `lazy`: só baixa e toca quando chega perto da tela; fora dela, pausa.
 */
export function EmberVideo({ play = true, lazy = false, className }: { play?: boolean; lazy?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(!lazy);

  useEffect(() => {
    if (!lazy) return;
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "50% 0px" });
    observer.observe(video);
    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!play || !near) {
      video.pause();
      return;
    }
    // Alguns navegadores só iniciam o autoplay com um empurrão explícito.
    video.play().catch(() => {});
  }, [play, near]);

  return (
    <video
      ref={ref}
      className={cn("absolute inset-0 size-full object-cover object-[68%_center]", className)}
      poster="/hero-poster.jpg"
      autoPlay={play && !lazy}
      muted
      loop
      playsInline
      preload={lazy ? "none" : "auto"}
      aria-hidden="true"
    >
      {/* WebM (VP9) é quatro vezes menor e começa antes; o MP4 (H.264) cobre o resto. */}
      <source src="/hero-loop.webm" type="video/webm" />
      <source src="/hero-loop.mp4" type="video/mp4" />
    </video>
  );
}
