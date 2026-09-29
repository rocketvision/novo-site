import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/** Convite ao fim do artigo, de acordo com o assunto. Sem promessas de resultado. */
const CTA: Record<string, { title: string; text: string }> = {
  "inteligencia-artificial": { title: "Quer colocar IA para trabalhar na sua operação?", text: "A gente ajuda a escolher onde a IA faz sentido, com dados protegidos e custo sob controle." },
  ciberseguranca: { title: "Seu sistema está preparado para esses riscos?", text: "Construímos e revisamos sistemas com segurança desde a arquitetura, não como remendo." },
  desenvolvimento: { title: "Precisa de um sistema feito sob medida?", text: "Da ideia à operação: arquitetura, interface e código pensados para durar." },
  tendencias: { title: "Quer saber o que disso vale para a sua empresa?", text: "Conversamos sobre o seu cenário e separamos o que é tendência do que é prioridade." },
  negocios: { title: "Tecnologia para vender mais e organizar a operação.", text: "Sites, sistemas e aplicativos com foco no resultado do negócio." },
};
const DEFAULT = { title: "Tem um projeto em mente?", text: "Conte o que você precisa. A gente responde com um caminho claro, sem enrolação." };

export function BlogCta({ category }: { category: string }) {
  const cta = CTA[category] ?? DEFAULT;
  return (
    <aside aria-label="Fale com a Rocket Vision" className="rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 sm:py-12">
      <p className="text-eyebrow text-white/50">Rocket Vision</p>
      <p className="mt-4 max-w-2xl text-[clamp(1.5rem,2.6vw,2.1rem)] leading-tight font-semibold tracking-[-0.02em] text-balance">{cta.title}</p>
      <p className="mt-3 max-w-xl text-white/65">{cta.text}</p>
      <ButtonLink href="/#contato" variant="inverse" className="mt-7" icon={<ArrowRight className="size-4" />}>
        Conversar com a Rocket
      </ButtonLink>
    </aside>
  );
}
