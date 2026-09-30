import { MotionProvider } from "@/components/animations/motion-provider";
import { Preloader } from "@/components/layout/preloader";
import { IntroDone } from "@/components/layout/intro-done";
import { SmoothScroll } from "@/components/animations/smooth-scroll";
import { DiagnosticProvider } from "@/components/diagnostic/diagnostic";
import { getSectionContent } from "@/server/content/public";
import "lenis/dist/lenis.css";

/** Layout do site público: abertura, animações e atalho de acessibilidade. O CMS não usa nada disso. */
export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSectionContent("site");
  return (
    <>
      {/* Marcador que ativa a escala para telas grandes (globals.css). */}
      <span data-site-scale hidden />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <Preloader />
      <IntroDone />
      <SmoothScroll />
      <MotionProvider>
        {/* O diagnóstico (quiz) abre de qualquer página e substitui o formulário de contato. */}
        <DiagnosticProvider whatsapp={settings.contact.whatsapp}>{children}</DiagnosticProvider>
      </MotionProvider>
    </>
  );
}
