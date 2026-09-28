import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { services } from "@/content/landing";
import { ServicesShowcase } from "./services-showcase";

export function Services() {
  return (
    <section id="servicos" aria-labelledby="servicos-titulo" className="bg-paper pt-8 pb-24 md:pb-32">
      <div className="container-page">
        <Reveal className="max-w-3xl">
          <Eyebrow>{services.eyebrow}</Eyebrow>
          <h2 id="servicos-titulo" className="text-headline mt-6 text-ink">
            {services.title}
          </h2>
          <p className="text-lead mt-6 max-w-2xl text-muted">{services.lead}</p>
        </Reveal>
      </div>
      <ServicesShowcase items={services.items} />
    </section>
  );
}
