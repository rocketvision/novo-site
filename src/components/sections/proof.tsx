import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { proof, proofPlaceholder, type CaseStudy } from "@/content/landing";

/**
 * Prova social: cases e depoimentos reais.
 *
 * Sem dados cadastrados em content/landing.ts, a seção não é exibida em produção.
 * Em desenvolvimento, mostra exemplos sinalizados para revisão do layout.
 */
export function Proof() {
  const hasRealData = proof.cases.length > 0 || proof.testimonials.length > 0;
  const isPreview = !hasRealData && process.env.NODE_ENV === "development";
  if (!hasRealData && !isPreview) return null;

  const { cases, testimonials } = hasRealData ? proof : proofPlaceholder;

  return (
    <section id="projetos" aria-labelledby="projetos-titulo" className="bg-paper py-24 md:py-36">
      <div className="container-page">
        {isPreview && (
          <p className="mb-10 inline-flex rounded-full bg-accent/10 px-4 py-2 font-mono text-xs text-accent-strong">
            Pré-visualização: conteúdo de exemplo, visível apenas em desenvolvimento.
          </p>
        )}

        <Reveal className="max-w-3xl">
          <Eyebrow>{proof.eyebrow}</Eyebrow>
          <h2 id="projetos-titulo" className="text-headline mt-6 text-ink">
            {proof.title}
          </h2>
        </Reveal>

        {cases.length > 0 && (
          <ul className="mt-16 grid gap-x-8 gap-y-16 md:mt-20 md:grid-cols-2">
            {cases.map((item, i) => (
              <Reveal as="li" key={i} delay={(i % 2) * 0.08}>
                <CaseItem item={item} />
              </Reveal>
            ))}
          </ul>
        )}

        {testimonials.length > 0 && (
          <div className="mt-24 space-y-20 md:mt-32">
            {testimonials.map((t, i) => (
              <Reveal as="div" key={i}>
                <figure className="mx-auto max-w-4xl text-center">
                  <blockquote className="text-title text-ink">
                    <p>&ldquo;{t.quote}&rdquo;</p>
                  </blockquote>
                  <figcaption className="mt-8 text-sm text-muted">
                    <span className="font-medium text-ink">{t.author}</span>
                    <span className="mx-2 text-black/20">/</span>
                    {t.role}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CaseItem({ item }: { item: CaseStudy }) {
  const content = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-mist">
        {item.image && (
          <Image
            src={item.image.src}
            alt={item.image.alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        )}
      </div>
      <p className="text-eyebrow mt-6 text-muted">
        {item.client} <span className="mx-1.5 text-black/20">/</span> {item.segment}
      </p>
      <h3 className="text-title mt-3 flex items-start justify-between gap-4 text-ink">
        {item.title}
        {item.href && (
          <ArrowUpRight aria-hidden="true" className="mt-1 size-6 shrink-0 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </h3>
      <p className="text-body mt-3 text-muted">{item.result}</p>
    </>
  );

  return item.href ? (
    <Link href={item.href} className="group block">
      {content}
    </Link>
  ) : (
    <div className="group">{content}</div>
  );
}
