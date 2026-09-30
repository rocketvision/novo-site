"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { rail } from "@/content/landing-scenes";
import { cn } from "@/lib/utils";

/** Prata das letras preenchidas e do botão redondo. */
const SILVER = "bg-[linear-gradient(180deg,#f6f7f9,#bcc1ca)]";

/**
 * Trilho lateral: a rota da página em capítulos. Entra deslizando quando a abertura sai da tela e fica
 * até o fim. Cada capítulo é uma letra da marca (R de Resultado, V de Visão e o foguete) apagada que
 * se preenche de prata, de baixo para cima, conforme o scroll avança naquele capítulo; o capítulo
 * atual acende o nome e ganha um ponto azul. No pé, o convite: orçamento e o botão de conversa
 * (WhatsApp quando há número cadastrado). Telas a partir de 1024 px.
 */
export function SideRail({ whatsapp }: { whatsapp?: string }) {
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState(-1);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const hero = document.getElementById("inicio")?.getBoundingClientRect();
      // Entra quando a primeira seção depois da abertura começa a subir. Até lá, a margem reservada tem a
      // cor do próprio trilho (ver page.tsx), então nunca aparece um vão claro.
      const on = !hero || hero.bottom < vh * 0.8;
      setShown(on);
      document.documentElement.classList.toggle("rail-on", on);

      let current = -1;
      rail.forEach((chapter, i) => {
        const first = document.getElementById(chapter.from)?.getBoundingClientRect();
        const last = document.getElementById(chapter.to)?.getBoundingClientRect();
        if (!first || !last) return;
        // Progresso do capítulo: 0 quando ele chega ao topo da tela, 1 quando o fim dele chega ao pé.
        const span = Math.max(1, last.bottom - first.top - vh);
        const k = Math.min(1, Math.max(0, -first.top / span));
        const fill = fills.current[i];
        if (fill) fill.style.clipPath = `inset(${((1 - k) * 100).toFixed(2)}% 0 0 0)`;
        if (first.top <= vh / 2 && last.bottom >= vh / 2) current = i;
      });
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.documentElement.classList.remove("rail-on");
    };
  }, []);

  const talk = whatsapp
    ? { href: `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Vim pelo site da Rocket Vision e quero conversar sobre um projeto.")}`, label: "Chamar no WhatsApp", external: true }
    : { href: "/#contato", label: "Falar com a Rocket", external: false };

  return (
    <aside
      aria-label="Navegação"
      className="fixed inset-y-0 left-0 z-[60] hidden w-[var(--rail)] flex-col items-center border-r border-white/[0.08] bg-[#050507]/95 py-6 backdrop-blur-md transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex"
      style={{ transform: shown ? "translateX(0)" : "translateX(-110%)" }}
      inert={!shown}
    >
      <Link href="/" aria-label="Rocket Vision, voltar ao início" className={cn("block text-[#e9ecf0] transition-opacity duration-700", shown ? "opacity-100" : "opacity-0")}>
        <LogoMark animated className="size-9" />
      </Link>

      <nav aria-label="Capítulos" className="my-auto flex flex-col items-center gap-9">
        {rail.map((chapter, i) => {
          const on = i === active;
          return (
            <a key={chapter.id} href={`/#${chapter.id}`} aria-label={`${chapter.label} (${chapter.meaning})`} className="group flex flex-col items-center gap-3">
              <span className="relative block size-7">
                <Glyph glyph={chapter.glyph} className="text-white/20" />
                <span
                  ref={(el) => {
                    fills.current[i] = el;
                  }}
                  className="absolute inset-0 transition-[clip-path] duration-200"
                  style={{ clipPath: "inset(100% 0 0 0)" }}
                >
                  <Glyph glyph={chapter.glyph} silver />
                </span>
              </span>
              <span className={cn("rotate-180 text-[0.68rem] tracking-[0.08em] uppercase transition-colors [writing-mode:vertical-rl]", on ? "text-white/90" : "text-white/45 group-hover:text-white/80")}>
                {chapter.label}
              </span>
              <span aria-hidden="true" className={cn("size-1 rounded-full transition-colors", on ? "bg-[#2c9df5]" : "bg-transparent")} />
            </a>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-4">
        <Link href="/#contato" className="rotate-180 text-[0.68rem] tracking-[0.08em] text-white/60 uppercase transition-colors [writing-mode:vertical-rl] hover:text-white">
          Orçamento
        </Link>
        <a
          href={talk.href}
          {...(talk.external && { target: "_blank", rel: "noreferrer" })}
          aria-label={talk.label}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-full text-[#0b0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-shadow hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_28px_-6px_rgb(44_157_245/0.7)]",
            SILVER,
          )}
        >
          {whatsapp ? <WhatsAppIcon /> : <ArrowRight className="size-[18px] -rotate-45" aria-hidden="true" />}
        </a>
      </div>
    </aside>
  );
}

/** Letra do capítulo (ou o foguete da marca): apagada por baixo, prateada por cima. */
function Glyph({ glyph, silver = false, className }: { glyph: string; silver?: boolean; className?: string }) {
  if (glyph === "mark") {
    return <LogoMark className={cn("absolute inset-0 size-full", silver ? "text-[#e9ecf0]" : className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute inset-0 grid place-items-center text-[2rem] leading-none font-extralight tracking-[-0.04em]",
        silver ? cn(SILVER, "bg-clip-text text-transparent") : className,
      )}
    >
      {glyph}
    </span>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-[18px]">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.37l-.36-.22-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.46 0 .1 5.33.1 11.89c0 2.1.55 4.14 1.6 5.95L0 24l6.34-1.65a12.06 12.06 0 0 0 5.71 1.45h.01c6.58 0 11.95-5.33 11.95-11.89 0-3.18-1.24-6.16-3.5-8.41" />
    </svg>
  );
}
