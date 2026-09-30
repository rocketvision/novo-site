import Link from "next/link";
import { HubLogo } from "@/components/hub/brand";
import { OrbitField } from "@/components/alliance/orbit-field";
import { PROGRAM } from "@/lib/alliance/constants";

/** Telas de acesso do Hub: o ecossistema à esquerda (desktop) e o formulário à direita. */
export default function HubAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <section aria-hidden="true" className="relative hidden overflow-hidden bg-[#050507] text-white lg:block">
        <OrbitField className="absolute inset-0 h-full w-full opacity-80" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,#050507_95%)]" />
        <div className="absolute inset-x-12 bottom-12">
          <p className="font-mono text-[11px] tracking-[0.2em] text-white/50 uppercase">{PROGRAM.signature}</p>
          <p className="mt-4 font-serif text-[2.4rem] leading-tight italic">{PROGRAM.slogan}</p>
          <p className="mt-2 text-[15px] text-white/60">{PROGRAM.complement}</p>
        </div>
      </section>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[22rem]">
          <Link href="/partners" className="mb-10 inline-block" aria-label="Rocket Alliance">
            <HubLogo />
          </Link>
          {children}
        </div>
      </div>
    </main>
  );
}
