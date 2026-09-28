import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroScene } from "@/components/sections/hero-scene";
import { ShiftScene } from "@/components/sections/shift-scene";
import { Statement } from "@/components/sections/statement";
import { Services } from "@/components/sections/services";
import { Differentials } from "@/components/sections/differentials";
import { Proof } from "@/components/sections/proof";
import { Process } from "@/components/sections/process";
import { Turn } from "@/components/sections/turn";
import { FinalCta } from "@/components/sections/final-cta";
import { site } from "@/lib/site";

/**
 * Narrativa: promessa que se abre em fotografia, problema, o que muda,
 * virada para a solução, serviços, diferenciais, provas, processo,
 * momento tipográfico e conversa.
 */
export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
        url: site.url,
        description: site.description,
        ...(site.contact.email && { email: site.contact.email }),
        ...(site.contact.phone && { telephone: site.contact.phone }),
        ...(site.social.length > 0 && { sameAs: site.social.map((s) => s.href) }),
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        inLanguage: "pt-BR",
        publisher: { "@id": `${site.url}/#organization` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Header />
      <main id="conteudo">
        <HeroScene />
        <ShiftScene />
        <Statement />
        <Services />
        <Differentials />
        <Proof />
        <Process />
        <Turn />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
