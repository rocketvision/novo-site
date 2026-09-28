import { Reveal, RevealGroup, RevealItem } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cta } from "@/content/landing";
import { ContactForm } from "./contact-form";

export function FinalCta() {
  return (
    <section
      id="contato"
      aria-labelledby="contato-titulo"
      className="relative overflow-hidden bg-ink py-28 text-white md:py-40"
      data-header="dark"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-1/3 left-1/2 h-[70%] w-[90%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.16),transparent)] blur-3xl"
      />

      <div className="container-page relative grid gap-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+4rem)]">
            <Eyebrow className="text-white/50">{cta.eyebrow}</Eyebrow>
            <h2 id="contato-titulo" className="text-headline mt-6 lg:text-[clamp(3rem,1rem+3.6vw,5rem)]">
              <RevealGroup as="span" className="block">
                {cta.title.map((line) => (
                  <RevealItem as="span" key={line} className="block">
                    {line}
                  </RevealItem>
                ))}
              </RevealGroup>
            </h2>
            <Reveal as="p" delay={0.2} className="text-lead mt-8 max-w-xl text-white/60">
              {cta.lead}
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.1} className="lg:col-span-6 lg:col-start-7 lg:pt-4">
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
