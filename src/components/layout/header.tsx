"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { RestrictedList, RestrictedMenu } from "@/components/layout/restricted-access";
import { ButtonLink } from "@/components/ui/button";
import { nav, primaryCta } from "@/lib/site";
import { ease, duration, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Header fixo. Transparente no topo, ganha fundo translúcido ao rolar
 * e troca para a versão escura sobre seções marcadas com data-header="dark".
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [onDark, setOnDark] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
      const probe = 32;
      const darkSections = document.querySelectorAll<HTMLElement>("[data-header='dark']");
      let dark = false;
      darkSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= probe && rect.bottom >= probe) dark = true;
      });
      setOnDark(dark);
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
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dark = onDark && !open;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "absolute inset-0 transition-[background-color,border-color,backdrop-filter] duration-500 ease-out",
          "border-b",
          open
            ? "border-transparent bg-paper"
            : scrolled
              ? dark
                ? "border-white/[0.06] bg-ink/70 backdrop-blur-xl backdrop-saturate-150"
                : "border-black/[0.06] bg-paper/75 backdrop-blur-xl backdrop-saturate-150"
              : "border-transparent",
        )}
      />
      <div className="container-page relative flex h-(--header-height) items-center justify-between">
        <Link
          href="/"
          aria-label="Rocket Vision, voltar ao início"
          className={cn("transition-colors duration-500", dark ? "text-white" : "text-ink")}
          onClick={() => setOpen(false)}
        >
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "link-underline pb-0.5 text-sm transition-colors duration-500",
                    dark ? "text-white/70 hover:text-white" : "text-graphite/75 hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <RestrictedMenu dark={dark} />
          <ButtonLink
            href={primaryCta.href}
            size="sm"
            variant={dark ? "inverse" : "primary"}
            className="hidden sm:inline-flex"
          >
            {primaryCta.label}
          </ButtonLink>

          <button
            ref={toggleRef}
            type="button"
            className={cn(
              "relative -mr-2 flex size-11 items-center justify-center rounded-full md:hidden",
              dark ? "text-white" : "text-ink",
            )}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="relative block h-3 w-5">
              <span
                className={cn(
                  "absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-transform duration-500 ease-out",
                  open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-transform duration-500 ease-out",
                  open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            className="fixed inset-x-0 top-(--header-height) bottom-0 bg-paper md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.fast, ease: ease.out }}
          >
            <nav
              aria-label="Menu"
              className="container-page flex h-full flex-col overflow-y-auto overscroll-contain pt-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] [@media(max-height:760px)]:pt-4"
            >
              <ul className="flex flex-col">
                {[...nav, { label: "Contato", href: "/#contato" }].map((item, i) => (
                  <m.li
                    key={item.href}
                    className="border-b border-line"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: duration.base, ease: ease.out, delay: 0.05 + i * stagger }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between py-5 text-[1.75rem] font-semibold tracking-[-0.03em] text-ink [@media(max-height:760px)]:py-3.5 [@media(max-height:760px)]:text-[1.5rem]"
                    >
                      {item.label}
                      <ArrowRight className="size-5 text-muted" />
                    </Link>
                  </m.li>
                ))}
              </ul>
              <m.div
                className="mt-auto space-y-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: duration.base, ease: ease.out, delay: 0.35 }}
              >
                <RestrictedList onNavigate={() => setOpen(false)} />
                <ButtonLink
                  href={primaryCta.href}
                  size="lg"
                  className="w-full"
                  icon={<ArrowRight className="size-4" />}
                  onClick={() => setOpen(false)}
                >
                  {primaryCta.label}
                </ButtonLink>
              </m.div>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
