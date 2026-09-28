import { ArrowDown, ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ScrollTilt } from "@/components/animations/scroll-tilt";
import { BrowserFrame } from "@/components/mockups/browser-frame";
import { DashboardMock } from "@/components/mockups/dashboard-mock";
import { hero } from "@/content/landing";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden bg-paper pt-[calc(var(--header-height)+3.5rem)] md:pt-[calc(var(--header-height)+6rem)]">
      {/* Luz ambiente muito sutil atrás do produto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[38%] -z-0 mx-auto h-[60%] max-w-5xl rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.10),transparent)] blur-2xl"
      />

      <div className="container-page relative">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="text-eyebrow animate-fade-up text-muted" style={delay(0)}>
            {hero.eyebrow}
          </p>

          <h1 className="text-display mt-6 text-ink">
            {hero.title.map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <span className="animate-rise block" style={delay(80 + i * 90)}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p className="text-lead animate-fade-up mt-7 max-w-2xl text-muted" style={delay(420)}>
            {hero.lead}
          </p>

          <div className="animate-fade-up mt-9 flex w-full flex-col items-center gap-3 xs:w-auto xs:flex-row" style={delay(540)}>
            <ButtonLink href="#contato" size="lg" icon={<ArrowRight className="size-4" />} className="w-full xs:w-auto">
              {hero.primaryCta}
            </ButtonLink>
            <ButtonLink
              href="#servicos"
              size="lg"
              variant="secondary"
              icon={<ArrowDown className="size-4 transition-transform group-hover/button:translate-y-0.5" />}
              className="w-full xs:w-auto"
            >
              {hero.secondaryCta}
            </ButtonLink>
          </div>
        </div>

        <div className="animate-fade-up relative mx-auto mt-16 max-w-6xl md:mt-20" style={delay(700)}>
          <ScrollTilt>
            <div className="rounded-[1.6rem] bg-white/60 p-1.5 shadow-[0_2px_0_rgb(255_255_255)_inset,0_50px_100px_-40px_rgb(0_0_0/0.35),0_20px_40px_-30px_rgb(0_0_0/0.25)] ring-1 ring-black/[0.06] md:p-2.5">
              <BrowserFrame address="gestao.suaempresa.com.br" className="aspect-[4/5] xs:aspect-[4/3] md:aspect-[16/10]">
                <DashboardMock />
              </BrowserFrame>
            </div>
          </ScrollTilt>
          {/* Fade para a próxima seção. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper to-transparent" />
        </div>
      </div>
    </section>
  );
}
