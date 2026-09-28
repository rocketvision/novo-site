import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo, LogoMark } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

/**
 * 404 do site público. Também é o que aparece para projetos em rascunho, despublicados
 * ou arquivados: do lado de fora, eles simplesmente não existem.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col bg-ink text-white">
      <span data-site-scale hidden />
      <header className="container-page flex h-(--header-height) items-center">
        <Link href="/" aria-label="Rocket Vision, voltar ao início" className="text-white">
          <Logo />
        </Link>
      </header>
      <main id="conteudo" className="container-page flex flex-1 flex-col justify-center pb-24">
        <LogoMark className="size-10 -rotate-12 text-accent" />
        <p className="text-eyebrow mt-10 text-white/50">Erro 404</p>
        <h1 className="text-hero mt-5 max-w-4xl">
          Esta página
          <span className="block text-white/40">não está aqui.</span>
        </h1>
        <p className="text-lead mt-8 max-w-xl text-white/60">O endereço pode ter mudado ou a página não existe mais. Confira o link ou siga por um dos caminhos abaixo.</p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <ButtonLink href="/" variant="inverse" size="lg" icon={<ArrowRight className="size-4" />}>
            Voltar ao início
          </ButtonLink>
          <Link href="/projetos" className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-white/80 hover:text-white">
            <span className="link-underline">Ver projetos</span>
          </Link>
          <Link href="/#contato" className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-white/80 hover:text-white">
            <span className="link-underline">Falar com a Rocket</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
