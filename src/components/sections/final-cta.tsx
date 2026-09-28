"use client";

import { useRef } from "react";
import { m, useTransform } from "motion/react";
import { Reveal, RevealGroup, RevealItem } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Photo } from "@/components/ui/photo";
import { cta } from "@/content/landing";
import { media } from "@/content/media";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { insetClip, segment } from "@/lib/scroll";
import { ContactForm } from "./contact-form";

/**
 * Convite final: a fotografia noturna se abre até as bordas da tela
 * com o título sobre ela, e o formulário surge logo abaixo, no mesmo escuro.
 */
export function FinalCta() {
  const bandRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(bandRef, ["start end", "end start"]);
  const clipPath = useTransform(progress, (v) => {
    const t = segment(v, 0.05, 0.42);
    return insetClip(0, (1 - t) * 5, 0, (1 - t) * 5, (1 - t) * 32);
  });
  const scale = useTransform(progress, [0, 1], [1.2, 1]);

  return (
    <section id="contato" aria-labelledby="contato-titulo" className="relative bg-ink text-white" data-header="dark">
      <div ref={bandRef} className="relative h-[92svh] min-h-[34rem]">
        <m.div style={{ clipPath }} className="absolute inset-0 overflow-hidden">
          <m.div style={{ scale }} className="absolute inset-0">
            <Photo photo={media.cta} sizes="100vw" decorative />
          </m.div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/10" />
        </m.div>

        <div className="container-page relative flex h-full flex-col justify-end pb-16 md:pb-24">
          <Eyebrow className="text-white/60">{cta.eyebrow}</Eyebrow>
          <h2 id="contato-titulo" className="text-display mt-6 max-w-5xl">
            <RevealGroup as="span" className="block">
              {cta.title.map((line) => (
                <RevealItem as="span" key={line} className="block">
                  {line}
                </RevealItem>
              ))}
            </RevealGroup>
          </h2>
        </div>
      </div>

      <div className="container-page grid gap-14 pt-10 pb-28 md:pb-36 lg:grid-cols-12 lg:gap-12">
        <Reveal as="p" className="text-lead text-white/65 lg:col-span-4">
          {cta.lead}
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7 lg:col-start-6">
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
