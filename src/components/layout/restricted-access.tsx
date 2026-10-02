"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { AllianceMark } from "@/components/alliance/alliance-logo";
import { restrictedAreas } from "@/lib/site";
import { ease, duration } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Area = (typeof restrictedAreas)[number];

/** Cada painel com a sua luz: brasa da Rocket para clientes, azul do Alliance para parceiros. */
const LOOK: Record<Area["key"], { eyebrow: string; glow: string; accent: string }> = {
  client: {
    eyebrow: "Clientes",
    glow: "bg-[radial-gradient(140%_120%_at_0%_0%,rgb(255_91_31/0.28),rgb(42_11_2/0.55)_45%,transparent_75%)]",
    accent: "text-accent-soft",
  },
  partner: {
    eyebrow: "Rocket Alliance",
    glow: "bg-[radial-gradient(140%_120%_at_0%_0%,rgb(44_157_245/0.26),rgb(7_22_38/0.6)_45%,transparent_75%)]",
    accent: "text-[#7cc4ff]",
  },
};

/**
 * Cartão de um painel: luz da marca no canto, a marca grande e apagada saindo pela borda,
 * o nome do painel embaixo. No hover a luz acende e a marca avança um pouco.
 */
function AreaCard({ area, compact = false, onNavigate }: { area: Area; compact?: boolean; onNavigate?: () => void }) {
  const look = LOOK[area.key];
  return (
    <a
      href={area.href}
      onClick={onNavigate}
      className={cn(
        "group/area relative isolate flex flex-col justify-between overflow-hidden rounded-[1.1rem] bg-[#0e0e10] text-white ring-1 ring-white/[0.07] ring-inset",
        "transition-[box-shadow] duration-500 ease-out hover:ring-white/15 focus-visible:ring-white/30 focus-visible:outline-none",
        compact ? "h-36 p-4" : "h-44 p-5",
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-0 -z-10 opacity-85 transition-opacity duration-500 group-hover/area:opacity-100", look.glow)} />
      <span
        aria-hidden="true"
        className="absolute -right-7 -bottom-8 -z-10 text-white/[0.06] transition-transform duration-700 ease-out group-hover/area:-translate-x-1.5 group-hover/area:-translate-y-1.5 group-hover/area:text-white/[0.1]"
      >
        {area.key === "partner" ? <AllianceMark className="h-28 w-auto" /> : <LogoMark className="size-32" />}
      </span>

      <span className="flex items-center justify-between">
        <span className={cn("font-mono text-[0.62rem] tracking-[0.16em] uppercase", look.accent)}>{look.eyebrow}</span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 text-white/35 transition-[transform,color] duration-500 ease-out group-hover/area:translate-x-0.5 group-hover/area:-translate-y-0.5 group-hover/area:text-white"
        />
      </span>

      <span>
        <span className={cn("block leading-[1.05] font-semibold tracking-[-0.03em]", compact ? "text-[1.05rem]" : "text-[1.2rem]")}>
          {area.label.replace("Painel do ", "Painel do ")}
        </span>
        <span className="mt-1.5 block text-xs text-white/45 transition-colors duration-500 group-hover/area:text-white/70">Entrar</span>
      </span>
    </a>
  );
}

/**
 * "Área restrita" no header (a partir de md): um link discreto, no mesmo tom da navegação, que abre
 * dois cartões, um para cada painel. Fecha com Esc (devolvendo o foco), com clique fora e ao escolher.
 */
export function RestrictedMenu({ dark }: { dark: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative mr-3 hidden items-center md:flex">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md text-sm transition-colors duration-500 focus-visible:outline-offset-4",
          dark ? "text-white/70 hover:text-white" : "text-graphite/75 hover:text-ink",
          open && (dark ? "text-white" : "text-ink"),
        )}
      >
        <LockKeyhole aria-hidden="true" className="size-3.5 opacity-70" />
        Área restrita
      </button>
      <span aria-hidden="true" className={cn("ml-5 h-4 w-px transition-colors duration-500", dark ? "bg-white/15" : "bg-black/10")} />

      <AnimatePresence>
        {open && (
          <m.div
            id={menuId}
            className="absolute top-[calc(100%+0.875rem)] right-0 w-[29rem] origin-top-right rounded-[1.5rem] bg-[#09090b]/95 p-2 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/10 backdrop-blur-xl"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: duration.fast, ease: ease.out }}
          >
            <ul className="grid grid-cols-2 gap-2">
              {restrictedAreas.map((area) => (
                <li key={area.key}>
                  <AreaCard area={area} onNavigate={() => setOpen(false)} />
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2 px-3 pt-3 pb-1.5 text-xs text-white/40">
              <LockKeyhole aria-hidden="true" className="size-3" />
              Acesso exclusivo para clientes e parceiros da Rocket Vision.
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Os dois painéis no menu do celular, lado a lado. */
export function RestrictedList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="pt-4">
      <p className="mb-3 flex items-center gap-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-subtle uppercase">
        <LockKeyhole aria-hidden="true" className="size-3" />
        Área restrita
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {restrictedAreas.map((area) => (
          <li key={area.key}>
            <AreaCard area={area} compact onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}
