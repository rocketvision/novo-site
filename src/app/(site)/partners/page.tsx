import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PreviewBar } from "@/components/layout/preview-bar";
import { Reveal } from "@/components/animations/reveal";
import { JsonLd } from "@/components/blog/json-ld";
import { AllianceHero, Commissions, Concept, Faq, HowItWorks, Modalities, Tiers } from "@/components/alliance/program-sections";
import { Directory } from "@/components/alliance/directory";
import { ApplyForm } from "@/components/alliance/apply-form";
import { alliancePage } from "@/content/alliance";
import { PROGRAM } from "@/lib/alliance/constants";
import { site } from "@/lib/site";
import { getSectionContent, isPreviewing } from "@/server/content/public";
import { getDirectory, getPublicProgram } from "@/server/alliance/public";

/** Estática, reconstruída quando o conteúdo, o diretório ou as regras públicas mudam (cache por tag). */
export const revalidate = 3600;

const TITLE = `${PROGRAM.name} | ${PROGRAM.signature}`;
const DESCRIPTION = "O programa oficial de parcerias da Rocket Vision: indicações, soluções digitais, projetos em conjunto e receita recorrente. Grow Together. Go Beyond.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/partners" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/partners", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/**
 * Rocket Alliance: a página pública do programa de parcerias. Hero, conceito, modalidades, níveis,
 * jornada, comissões, diretório de parceiros, FAQ e a candidatura (Become a Partner).
 */
export default async function PartnersPage() {
  const [content, settings, program, directory, previewing] = await Promise.all([getSectionContent("alliance"), getSectionContent("site"), getPublicProgram(), getDirectory(), isPreviewing()]);
  const tierNames = Object.fromEntries(program.tiers.map((t) => [t.key, t.name]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${site.url}/partners#webpage`,
        url: `${site.url}/partners`,
        name: TITLE,
        description: DESCRIPTION,
        isPartOf: { "@type": "WebSite", url: site.url, name: site.name },
        about: { "@id": `${site.url}/#organization` },
      },
      { "@type": "Organization", "@id": `${site.url}/#organization`, name: site.name, url: site.url, slogan: site.slogan },
      ...(directory.length > 0
        ? [
            {
              "@type": "ItemList",
              name: "Rocket Alliance: parceiros",
              itemListElement: directory.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${site.url}/partners/${p.slug}`, name: p.tradeName })),
            },
          ]
        : []),
      ...(content.faq.length > 0
        ? [{ "@type": "FAQPage", mainEntity: content.faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }]
        : []),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main id="conteudo">
        <AllianceHero />
        <Concept content={content.whatIs} />
        <Modalities modalities={program.modalities} />
        <Tiers tiers={program.tiers} />
        <HowItWorks />
        <Commissions content={content.commissions} tiers={program.tiers} />

        <section id="parceiros" data-header="dark" aria-labelledby="directory-title" className="relative overflow-hidden bg-[#09090b] text-white">
          <div className="container-page relative py-28 md:py-36">
            <Reveal className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className="text-eyebrow text-white/45">{alliancePage.directory.eyebrow}</p>
                <h2 id="directory-title" className="mt-6 text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1] font-semibold tracking-[-0.045em]">
                  {content.directory.title}
                </h2>
              </div>
              <p className="max-w-[28rem] text-[0.95rem] leading-relaxed text-white/60 lg:col-span-5">{content.directory.lead}</p>
            </Reveal>
            <Directory partners={directory} modalities={program.modalities.map((m) => ({ key: m.key, name: m.name }))} tiers={tierNames} />
          </div>
        </section>

        <Faq items={content.faq} />

        <section id="aplicar" data-header="dark" aria-labelledby="apply-title" className="relative isolate overflow-hidden bg-[#050507] text-white">
          <div aria-hidden="true" className="absolute top-0 left-1/2 -z-10 h-[50rem] w-[80rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgb(44_157_245/0.16),transparent)]" />
          <div className="container-page grid gap-14 py-28 md:py-36 lg:grid-cols-12">
            <Reveal className="lg:col-span-5">
              <p className="text-eyebrow text-white/45">{PROGRAM.signature}</p>
              <h2 id="apply-title" className="mt-6 text-[clamp(2.75rem,1.4rem+4.4vw,5.5rem)] leading-[0.92] font-semibold tracking-[-0.05em]">
                {alliancePage.final.title}
              </h2>
              <p className="mt-6 font-serif text-[clamp(1.4rem,1.1rem+1vw,2rem)] text-white/85 italic">{alliancePage.final.slogan}</p>
              <p className="mt-8 max-w-[26rem] text-[0.95rem] leading-relaxed text-white/55">{content.apply.lead}</p>
            </Reveal>
            <div className="rounded-[2rem] bg-white/[0.025] p-6 ring-1 ring-white/10 backdrop-blur-sm sm:p-10 lg:col-span-7">
              <h3 className="sr-only">{content.apply.title}</h3>
              <ApplyForm modalities={program.modalities.map((m) => ({ key: m.key, name: m.name, description: m.description }))} />
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
      {previewing && <PreviewBar />}
    </>
  );
}
