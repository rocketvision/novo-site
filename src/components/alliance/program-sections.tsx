import Link from "next/link";
import { ArrowRight, Briefcase, Code, Compass, Handshake, Layers, Network, Rocket, TrendingUp } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { alliancePage as copy } from "@/content/alliance";
import { TIER_CRITERIA } from "@/lib/alliance/constants";
import { formatRate } from "@/lib/alliance/money";
import type { Resolved } from "@/lib/content/resolved";
import type { PublicProgram } from "@/server/alliance/public";
import { cn } from "@/lib/utils";
import { OrbitField } from "./orbit-field";
import { Journey } from "./journey";
import { TierBadge } from "./tier-badge";
import { AllianceMark } from "./alliance-logo";

/**
 * Seções da página do Rocket Alliance (/partners). Alternam claro e escuro como os capítulos da home,
 * com o azul da Rocket como único acento. Textos do programa vêm do CMS (seção "Página do Rocket
 * Alliance"), das modalidades e níveis cadastrados e das regras de comissão aprovadas.
 */

export const BLUE = "#2c9df5";
const ICONS: Record<string, typeof Handshake> = { Handshake, Briefcase, Code, Compass };

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

export function AllianceHero() {
  const h = copy.hero;
  return (
    <section data-header="dark" aria-labelledby="alliance-title" className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#050507] text-white">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_70%_45%,rgb(44_157_245/0.16),transparent_70%)]" />
      <OrbitField className="absolute inset-y-0 right-[-18%] -z-10 h-full w-[120%] opacity-90 md:right-[-8%] md:w-[80%]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#050507_18%,rgb(5_5_7/0.72)_48%,transparent_80%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#050507] to-transparent" />

      <div className="container-page relative pt-[calc(var(--header-height)+4rem)] pb-24">
        <div className="flex animate-[fade-up_900ms_var(--ease-out)_both] items-center gap-4">
          <AllianceMark accent animated className="h-10 text-white sm:h-12" title="Rocket Alliance" />
          <span aria-hidden="true" className="h-6 w-px bg-white/20" />
          <p className="text-eyebrow text-white/55">{h.eyebrow}</p>
        </div>
        <h1 id="alliance-title" className="mt-7 animate-[fade-up_900ms_var(--ease-out)_120ms_both] text-[clamp(3.1rem,1rem+8.5vw,8.5rem)] leading-[0.9] font-semibold tracking-[-0.055em]">
          Rocket
          <br />
          <span className="bg-[linear-gradient(180deg,#ffffff_20%,#9aa3b2)] bg-clip-text text-transparent">Alliance</span>
        </h1>
        <p className="mt-8 animate-[fade-up_900ms_var(--ease-out)_240ms_both] font-serif text-[clamp(1.6rem,1.1rem+1.6vw,2.6rem)] leading-tight tracking-[-0.01em] text-white/90 italic">{h.slogan}</p>
        <div className="mt-8 max-w-[34rem] animate-[fade-up_900ms_var(--ease-out)_360ms_both] space-y-2">
          <p className="text-[1.0625rem] font-medium text-white">{h.message}</p>
          <p className="text-[1rem] leading-relaxed text-pretty text-white/60">{h.lead}</p>
        </div>
        <div className="mt-10 flex animate-[fade-up_900ms_var(--ease-out)_480ms_both] flex-col gap-3 sm:flex-row sm:items-center">
          <a href="#aplicar" className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#f6f7f9_0%,#d3d7de_55%,#b9bec7_100%)] px-6 text-[0.95rem] font-semibold text-[#0b0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.18),0_10px_30px_-12px_rgba(0,0,0,0.8)] transition-[transform,box-shadow] duration-300 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_40px_-10px_rgb(44_157_245/0.55)]">
            {h.primary}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
          <a href="#parceiros" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.03] px-6 text-[0.95rem] font-medium text-white/85 transition-colors duration-300 hover:border-white/40 hover:bg-white/[0.07] hover:text-white">
            {h.secondary}
          </a>
        </div>
        <p className="mt-10 animate-[fade-up_900ms_var(--ease-out)_600ms_both] text-[0.8125rem] text-white/45">
          {copy.hub.label}{" "}
          <Link href="/alliance/login" className="text-white/75 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60">
            {copy.hub.link}
          </Link>
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* O que é                                                                     */
/* -------------------------------------------------------------------------- */

const PILLARS = [
  { icon: Network, title: "Colaboração", body: "Empresas, profissionais de tecnologia, agências e consultores trabalhando juntos, cada um no que faz de melhor." },
  { icon: TrendingUp, title: "Oportunidades comerciais", body: "Indicar clientes e comercializar soluções digitais com o respaldo da Rocket Vision." },
  { icon: Layers, title: "Desenvolvimento conjunto", body: "Projetos construídos em conjunto, com colaboração técnica e responsabilidades claras." },
  { icon: Rocket, title: "Crescimento compartilhado", body: "Receita recorrente, benefícios progressivos e reconhecimento para quem cresce junto." },
];

export function Concept({ content }: { content: Resolved<"alliance">["whatIs"] }) {
  return (
    <section aria-labelledby="concept-title" className="tone-light relative overflow-hidden bg-tone text-fg">
      <span aria-hidden="true" className="pointer-events-none absolute -top-[6vw] right-[3vw] text-[min(56vw,44rem)] leading-none font-bold tracking-[-0.06em] text-fg/[0.03] select-none">
        A
      </span>
      <div className="container-page relative py-28 md:py-36">
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="text-eyebrow text-fg/45">Rocket Alliance</p>
            <h2 id="concept-title" className="mt-6 text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance">
              {content.title}
            </h2>
            <p className="mt-6 text-[0.95rem] font-medium tracking-[-0.01em]" style={{ color: BLUE }}>
              {copy.final.complement}
            </p>
          </Reveal>
          <Reveal className="space-y-5 text-[1.0625rem] leading-relaxed text-pretty text-fg/70 lg:col-span-6 lg:col-start-7" y={28}>
            {content.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </Reveal>
        </div>
        <ul className="mt-20 grid border-t border-fg/10 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.06} className="border-b border-fg/10 py-8 sm:[&:nth-child(odd)]:pr-8 lg:border-b-0 lg:px-6 lg:first:pl-0 lg:[&:not(:first-child)]:border-l">
              <p.icon className="size-5" style={{ color: BLUE }} strokeWidth={1.6} aria-hidden="true" />
              <h3 className="mt-5 text-[1.05rem] font-semibold tracking-[-0.02em]">{p.title}</h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-fg/60">{p.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Modalidades                                                                 */
/* -------------------------------------------------------------------------- */

export function Modalities({ modalities }: { modalities: PublicProgram["modalities"] }) {
  const m = copy.modalities;
  return (
    <section id="modalidades" data-header="dark" aria-labelledby="modalities-title" className="relative overflow-hidden bg-[#09090b] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 h-[40rem] w-[70rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgb(44_157_245/0.12),transparent)]" />
      <div className="container-page relative py-28 md:py-36">
        <Reveal className="max-w-[46rem]">
          <p className="text-eyebrow text-white/45">{m.eyebrow}</p>
          <h2 id="modalities-title" className="mt-6 text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1] font-semibold tracking-[-0.045em]">
            {m.title}
          </h2>
          <p className="mt-6 max-w-[40rem] text-[1rem] leading-relaxed text-pretty text-white/60">{m.lead}</p>
        </Reveal>
        <ul className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-white/[0.08] ring-1 ring-white/[0.08] md:grid-cols-2">
          {modalities.map((mod, i) => {
            const Icon = ICONS[mod.icon] ?? Handshake;
            return (
              <Reveal as="li" key={mod.key} delay={(i % 2) * 0.08} className="group relative bg-[#0b0b0e] p-8 transition-colors duration-500 hover:bg-[#0e0f13] md:p-10">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(40rem 20rem at 0% 0%, rgb(44 157 245 / 0.08), transparent 60%)` }} />
                <div className="relative flex items-start justify-between gap-6">
                  <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                    <Icon className="size-5 text-white/85" strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[0.7rem] text-white/30">0{i + 1}</span>
                </div>
                <h3 className="relative mt-10 text-[clamp(1.5rem,1.2rem+0.8vw,2rem)] leading-none font-semibold tracking-[-0.035em]">{mod.name}</h3>
                <p className="relative mt-4 max-w-[34rem] text-[0.95rem] leading-relaxed text-pretty text-white/60">{mod.description}</p>
                <span aria-hidden="true" className="relative mt-8 block h-px w-10 transition-[width] duration-500 group-hover:w-24" style={{ background: BLUE }} />
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Níveis                                                                      */
/* -------------------------------------------------------------------------- */

export function Tiers({ tiers }: { tiers: PublicProgram["tiers"] }) {
  const t = copy.tiers;
  return (
    <section id="niveis" aria-labelledby="tiers-title" className="tone-light relative overflow-hidden bg-tone text-fg">
      <div className="container-page relative py-28 md:py-36">
        <Reveal className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-eyebrow text-fg/45">{t.eyebrow}</p>
            <h2 id="tiers-title" className="mt-6 text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance">
              {t.title}
            </h2>
          </div>
          <p className="max-w-[30rem] text-[0.95rem] leading-relaxed text-fg/60 lg:col-span-5">{t.lead}</p>
        </Reveal>

        <ol className="mt-16 grid gap-4 md:grid-cols-3">
          {tiers.map((tier, i) => {
            const elite = i === tiers.length - 1;
            return (
              <Reveal as="li" key={tier.key} delay={i * 0.08} className={cn("relative flex flex-col overflow-hidden rounded-3xl p-8", elite ? "bg-[#0b0b0e] text-white ring-1 ring-white/10" : "bg-white ring-1 ring-black/[0.07]")}>
                {elite && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_18rem_at_100%_0%,rgb(44_157_245/0.18),transparent_60%)]" />}
                <div className="relative flex items-center justify-between">
                  <p className={cn("font-mono text-[0.65rem] tracking-[0.14em] uppercase", elite ? "text-white/45" : "text-fg/40")}>{tier.label}</p>
                  <TierBadge tier={tier.key} size={112} detailed title={`Selo ${tier.name}`} />
                </div>
                <h3 className="relative mt-10 text-[clamp(1.6rem,1.3rem+0.8vw,2.2rem)] leading-none font-semibold tracking-[-0.04em]">{tier.name}</h3>
                <p className={cn("relative mt-4 text-[0.9rem] leading-relaxed", elite ? "text-white/60" : "text-fg/60")}>{tier.description}</p>
                <ul className={cn("relative mt-8 space-y-3 border-t pt-6", elite ? "border-white/10" : "border-fg/10")}>
                  {tier.benefits.map((b) => (
                    <li key={b} className={cn("flex gap-3 text-[0.875rem] leading-snug", elite ? "text-white/80" : "text-fg/75")}>
                      <span className="mt-[0.5em] h-px w-3 shrink-0" style={{ background: BLUE }} aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </ol>

        <Reveal className="mt-12 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-[0.8125rem] text-fg/50">A evolução considera</span>
          {TIER_CRITERIA.map((c) => (
            <span key={c} className="rounded-full px-3.5 py-1.5 text-[0.8125rem] text-fg/70 ring-1 ring-fg/12">
              {c}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Como funciona                                                               */
/* -------------------------------------------------------------------------- */

export function HowItWorks() {
  return (
    <section id="como-funciona" data-header="dark" aria-labelledby="journey-title" className="relative overflow-hidden bg-[#050507] text-white">
      <div className="container-page relative py-28 md:py-36">
        <Reveal className="max-w-[40rem]">
          <p className="text-eyebrow text-white/45">{copy.journey.eyebrow}</p>
          <h2 id="journey-title" className="mt-6 text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1] font-semibold tracking-[-0.045em]">
            {copy.journey.title}
          </h2>
        </Reveal>
        <Journey />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Comissões e benefícios                                                      */
/* -------------------------------------------------------------------------- */

export function Commissions({ content, tiers }: { content: Resolved<"alliance">["commissions"]; tiers: PublicProgram["tiers"] }) {
  const c = copy.commissions;
  const rated = tiers.filter((t) => t.rateBp !== null);
  // Só mostra percentuais se o CMS mandou mostrar e há regras públicas aprovadas para todos os níveis.
  const showRates = content.rates === "show" && rated.length === tiers.length;
  return (
    <section id="comissoes" aria-labelledby="commissions-title" className="tone-light relative overflow-hidden bg-tone text-fg">
      <div className="container-page relative py-28 md:py-36">
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="text-eyebrow text-fg/45">{c.eyebrow}</p>
            <h2 id="commissions-title" className="mt-6 text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance">
              {c.title}
            </h2>
            <p className="mt-6 max-w-[28rem] text-[1rem] leading-relaxed text-fg/60">{content.intro}</p>
          </Reveal>
          <div className="lg:col-span-6 lg:col-start-7">
            {showRates && (
              <Reveal className="mb-10 grid grid-cols-3 overflow-hidden rounded-2xl ring-1 ring-fg/10">
                {tiers.map((t, i) => (
                  <div key={t.key} className={cn("px-5 py-6", i > 0 && "border-l border-fg/10")}>
                    <p className="text-[0.75rem] text-fg/50">{t.name}</p>
                    <p className="mt-2 text-[clamp(1.75rem,1.3rem+1.4vw,2.75rem)] leading-none font-semibold tracking-[-0.04em] tabular-nums">{formatRate(t.rateBp!)}</p>
                    <p className="mt-2 text-[0.7rem] text-fg/45">{c.rateLabel}</p>
                  </div>
                ))}
              </Reveal>
            )}
            <ol className="space-y-0 border-t border-fg/10">
              {content.rules.map((rule, i) => (
                <Reveal as="li" key={rule} delay={i * 0.05} className="flex gap-5 border-b border-fg/10 py-6">
                  <span className="font-mono text-[0.7rem] text-fg/35 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-[0.975rem] leading-relaxed text-pretty text-fg/75">{rule}</p>
                </Reveal>
              ))}
            </ol>
            {showRates && <p className="mt-6 text-[0.8rem] leading-relaxed text-fg/45">{c.ratesNote}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

export function Faq({ items }: { items: Resolved<"alliance">["faq"] }) {
  if (items.length === 0) return null;
  return (
    <section id="faq" aria-labelledby="faq-title" className="tone-light relative bg-tone text-fg">
      <div className="container-page grid gap-12 py-28 md:py-36 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <p className="text-eyebrow text-fg/45">{copy.faq.eyebrow}</p>
          <h2 id="faq-title" className="mt-6 text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1] font-semibold tracking-[-0.045em]">
            {copy.faq.title}
          </h2>
        </Reveal>
        <div className="border-t border-fg/10 lg:col-span-7 lg:col-start-6">
          {items.map((item) => (
            <details key={item.question} className="group border-b border-fg/10">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-[1.0625rem] font-medium tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden="true" className="relative mt-2 size-3 shrink-0">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
                  <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current transition-transform duration-300 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="-mt-1 pb-7 text-[0.975rem] leading-relaxed text-pretty text-fg/65">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Rótulo curto da modalidade para cartões (sem "Partner"). */
export function modalityShort(name: string) {
  return name.replace(/\s*Partner$/, "");
}
