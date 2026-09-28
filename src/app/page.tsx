import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { Problem } from "@/components/sections/problem";
import { Shift } from "@/components/sections/shift";
import { Statement } from "@/components/sections/statement";
import { Services } from "@/components/sections/services";
import { Differentials } from "@/components/sections/differentials";
import { Proof } from "@/components/sections/proof";
import { Process } from "@/components/sections/process";
import { FinalCta } from "@/components/sections/final-cta";
import { site } from "@/lib/site";

/**
 * Narrativa: problema, possibilidade, o que a Rocket faz, serviços,
 * diferenciais, provas, processo e conversa.
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
        <Hero />
        <Problem />
        <Shift />
        <Statement />
        <Services />
        <Differentials />
        <Proof />
        <Process />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
