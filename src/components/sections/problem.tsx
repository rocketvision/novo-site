import { TextReveal } from "@/components/animations/text-reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { problem } from "@/content/landing";

/** Problema: o visitante se reconhece enquanto as frases acendem com o scroll. */
export function Problem() {
  return (
    <section aria-labelledby="problema-titulo" className="relative bg-ink text-white" data-header="dark">
      <TextReveal
        text={problem.manifesto}
        emphasizeLast={6}
        label={
          <Eyebrow className="text-white/55">
            <span id="problema-titulo">{problem.eyebrow}</span>
          </Eyebrow>
        }
      />
    </section>
  );
}
