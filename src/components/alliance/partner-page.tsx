import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Globe, MapPin, Quote } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { LogoMark } from "@/components/ui/logo";
import type { PageBlock } from "@/lib/alliance/page-blocks";
import type { DirectoryCard, PublicPartner } from "@/lib/alliance/types";
import { cn } from "@/lib/utils";
import { TierBadge } from "./tier-badge";
import { AllianceMark } from "./alliance-logo";

/**
 * Página exclusiva de um parceiro: ROCKET VISION × PARCEIRO. Tudo vem do CMS (perfil publicado e
 * blocos); blocos sem conteúdo não aparecem, então nada é inventado. A cor de destaque do parceiro dá
 * identidade própria à página sem sair do Design System (tipografia, ritmo e tons são os do site).
 */

type Props = { partner: PublicPartner; modalityNames: Record<string, string>; tierName: string | null; others: DirectoryCard[] };

const websiteHost = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function PartnerPage({ partner: p, modalityNames, tierName, others }: Props) {
  const accent = p.accentColor;
  const logo = p.logoAlt ?? p.logo;
  const visitLabel = `Visit ${p.tradeName}`;
  const blocks = p.page.blocks.filter((b) => b.visible && hasContent(b, p, others));

  return (
    <article style={{ ["--accent" as string]: accent }}>
      {/* Hero */}
      <section data-header="dark" aria-labelledby="partner-title" className="relative isolate flex min-h-[92svh] items-end overflow-hidden bg-[#050507] text-white">
        {p.cover && (
          <Image src={p.cover.src} alt="" fill priority sizes="100vw" placeholder={p.cover.blurDataURL ? "blur" : "empty"} blurDataURL={p.cover.blurDataURL} className="-z-20 object-cover opacity-30" />
        )}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(5_5_7/0.7)_0%,rgb(5_5_7/0.55)_40%,#050507_90%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-60" style={{ background: `radial-gradient(50% 45% at 80% 20%, color-mix(in srgb, ${accent} 28%, transparent), transparent 70%)` }} />

        <Link href="/partners#parceiros" className="absolute top-[calc(var(--header-height)+1rem)] left-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 text-[0.8rem] text-white/75 backdrop-blur-md transition-colors hover:border-white/35 hover:text-white sm:left-8 lg:left-12">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <AllianceMark accent className="h-3.5 text-white" />
          Rocket Alliance
        </Link>

        <div className="container-page w-full pt-[calc(var(--header-height)+6rem)] pb-16 md:pb-24">
          <p className="animate-[fade-up_900ms_var(--ease-out)_both] font-mono text-[0.72rem] tracking-[0.2em] text-white/60 uppercase">
            Rocket Vision <span style={{ color: accent }}>×</span> {p.tradeName}
          </p>

          <div className="mt-10 flex animate-[fade-up_900ms_var(--ease-out)_120ms_both] flex-wrap items-center gap-6 sm:gap-10" aria-label={`Rocket Vision e ${p.tradeName}`}>
            <span className="inline-flex items-center gap-3 text-white">
              <LogoMark className="size-9 sm:size-11" />
              <span className="text-[1.35rem] font-semibold tracking-[-0.02em] sm:text-[1.6rem]">
                Rocket <span className="font-normal opacity-60">Vision</span>
              </span>
            </span>
            <span aria-hidden="true" className="h-10 w-px bg-white/25" />
            {logo ? (
              <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} sizes="240px" className={cn("h-10 w-auto max-w-[14rem] object-contain sm:h-12", !p.logoAlt && "brightness-0 invert")} />
            ) : (
              <span className="text-[1.75rem] font-semibold tracking-[-0.03em]">{p.tradeName}</span>
            )}
          </div>

          {p.page.hero.title && (
            <h1 id="partner-title" className="mt-12 max-w-[16ch] animate-[fade-up_900ms_var(--ease-out)_240ms_both] text-[clamp(2.6rem,1rem+6vw,6.5rem)] leading-[0.92] font-semibold tracking-[-0.05em] text-balance">
              {p.page.hero.title}
            </h1>
          )}
          {!p.page.hero.title && (
            <h1 id="partner-title" className="mt-12 animate-[fade-up_900ms_var(--ease-out)_240ms_both] text-[clamp(2.6rem,1rem+6vw,6.5rem)] leading-[0.92] font-semibold tracking-[-0.05em]">
              {p.tradeName}
            </h1>
          )}
          {(p.page.hero.subtitle || p.shortDescription) && (
            <p className="mt-6 max-w-[40rem] animate-[fade-up_900ms_var(--ease-out)_360ms_both] text-[1.0625rem] leading-relaxed text-pretty text-white/65">{p.page.hero.subtitle || p.shortDescription}</p>
          )}
          {p.websiteUrl && (
            <div className="mt-10 flex animate-[fade-up_900ms_var(--ease-out)_480ms_both] flex-wrap gap-3">
              <a href={p.websiteUrl} target="_blank" rel="noopener" className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[0.95rem] font-semibold text-[#0b0b0e] transition-[transform,box-shadow] duration-300 hover:-translate-y-px" style={{ boxShadow: `0 14px 40px -14px ${accent}` }}>
                {visitLabel}
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>

        {/* Selo do nível: só quando o perfil publicado mostra o nível. */}
        {tierName && p.tierKey && (
          <div className="absolute right-8 bottom-16 hidden animate-[fade-up_900ms_var(--ease-out)_600ms_both] lg:block xl:right-16 xl:bottom-24">
            <TierBadge tier={p.tierKey} size={176} detailed title={`Selo ${tierName}`} className="drop-shadow-[0_30px_60px_rgb(0_0_0/0.55)]" />
          </div>
        )}
      </section>

      <Facts partner={p} modalityNames={modalityNames} tierName={tierName} />

      {toned(blocks).map(({ block, tone }) => (
        <Block key={block.id} block={block} partner={p} tone={tone} others={others} visitLabel={visitLabel} />
      ))}
    </article>
  );
}

/**
 * Tons alternados, claro e escuro, como os capítulos da home. A chamada é sempre escura e o bloco
 * seguinte a ela volta ao claro: nunca ficam dois fundos escuros grandes em sequência.
 */
function toned(blocks: PageBlock[]) {
  let next: "light" | "dark" = "light";
  return blocks.map((block) => {
    if (block.kind === "cta") {
      next = "light";
      return { block, tone: "dark" as const };
    }
    const tone = next;
    next = tone === "light" ? "dark" : "light";
    return { block, tone };
  });
}

/** Faixa de dados públicos logo abaixo do hero. */
function Facts({ partner: p, modalityNames, tierName }: { partner: PublicPartner; modalityNames: Record<string, string>; tierName: string | null }) {
  const items = [
    p.sector && { label: "Setor", value: p.sector },
    p.modalities.length > 0 && { label: p.modalities.length > 1 ? "Modalidades" : "Modalidade", value: p.modalities.map((m) => modalityNames[m] ?? m).join(", ") },
    tierName && { label: "Nível", value: tierName, tier: p.tierKey },
    p.location && { label: "Localização", value: p.location, icon: MapPin },
    p.websiteUrl && { label: "Site", value: websiteHost(p.websiteUrl), href: p.websiteUrl, icon: Globe },
  ].filter(Boolean) as { label: string; value: string; href?: string; icon?: typeof Globe; tier?: string | null }[];
  if (items.length === 0) return null;
  return (
    <section aria-label="Sobre a parceria" data-header="dark" className="border-y border-white/[0.08] bg-[#050507] text-white">
      <dl className="container-page grid grid-cols-2 gap-px md:grid-cols-5">
        {items.map((f) => (
          <div key={f.label} className="py-6 pr-4">
            <dt className="font-mono text-[0.65rem] tracking-[0.14em] text-white/40 uppercase">{f.label}</dt>
            <dd className="mt-2 text-[0.9rem] text-white/85">
              {f.href ? (
                <a href={f.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline decoration-white/25 underline-offset-4 hover:decoration-white">
                  {f.value}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              ) : f.tier ? (
                <span className="inline-flex items-center gap-2">
                  <TierBadge tier={f.tier} size={22} />
                  {f.value}
                </span>
              ) : (
                f.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function hasContent(block: PageBlock, p: PublicPartner, others: DirectoryCard[]) {
  switch (block.kind) {
    case "text":
      return Boolean(block.body || (block.id === "default-about" && p.description));
    case "expertise":
      return p.specialties.length + p.services.length > 0;
    case "projects":
      return p.projects.length > 0;
    case "gallery":
      return p.gallery.length > 0;
    case "testimonials":
      return p.testimonials.length > 0;
    case "cta":
      return Boolean(block.url || p.websiteUrl);
    case "explore":
      return others.length > 0;
  }
}

function Heading({ eyebrow, title, tone }: { eyebrow?: string; title?: string; tone: "light" | "dark" }) {
  if (!eyebrow && !title) return null;
  return (
    <Reveal className="max-w-[44rem]">
      {eyebrow && <p className={cn("text-eyebrow", tone === "dark" ? "text-white/45" : "text-fg/45")}>{eyebrow}</p>}
      {title && <h2 className="mt-5 text-[clamp(2rem,1.2rem+2.6vw,3.6rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance">{title}</h2>}
      <span aria-hidden="true" className="mt-7 block h-px w-12" style={{ background: "var(--accent)" }} />
    </Reveal>
  );
}

function Block({ block, partner: p, tone, others, visitLabel }: { block: PageBlock; partner: PublicPartner; tone: "light" | "dark"; others: DirectoryCard[]; visitLabel: string }) {
  const dark = tone === "dark";
  const wrap = (children: React.ReactNode, extra?: string) => (
    <section data-header={dark ? "dark" : undefined} className={cn("relative overflow-hidden", dark ? "bg-[#09090b] text-white" : "tone-light bg-tone text-fg", extra)}>
      <div className="container-page py-24 md:py-32">{children}</div>
    </section>
  );
  const muted = dark ? "text-white/65" : "text-fg/65";

  switch (block.kind) {
    case "text": {
      const body = block.body || (block.id === "default-about" ? p.description : "");
      return wrap(
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Heading eyebrow={block.eyebrow} title={block.title} tone={tone} />
          </div>
          <Reveal y={28} className={cn("space-y-5 text-[1.0625rem] leading-relaxed text-pretty lg:col-span-6 lg:col-start-7", muted)}>
            {body
              .split(/\n\s*\n/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para) => (
                <p key={para.slice(0, 40)}>{para}</p>
              ))}
          </Reveal>
        </div>,
      );
    }
    case "expertise":
      return wrap(
        <>
          <Heading eyebrow={block.eyebrow} title={block.title} tone={tone} />
          <div className="mt-14 grid gap-12 md:grid-cols-2">
            {p.specialties.length > 0 && (
              <div>
                <p className={cn("text-[0.8125rem] font-medium", dark ? "text-white/50" : "text-fg/50")}>Especialidades</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {p.specialties.map((s) => (
                    <li key={s} className={cn("rounded-full px-4 py-2 text-[0.9rem] ring-1", dark ? "text-white/85 ring-white/15" : "text-fg/80 ring-fg/12")}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {p.services.length > 0 && (
              <div>
                <p className={cn("text-[0.8125rem] font-medium", dark ? "text-white/50" : "text-fg/50")}>Serviços</p>
                <ul className={cn("mt-5 border-t", dark ? "border-white/10" : "border-fg/10")}>
                  {p.services.map((s) => (
                    <li key={s} className={cn("flex items-center gap-3 border-b py-4 text-[1rem]", dark ? "border-white/10 text-white/85" : "border-fg/10 text-fg/80")}>
                      <span aria-hidden="true" className="h-px w-4 shrink-0" style={{ background: "var(--accent)" }} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>,
      );
    case "projects":
      return wrap(
        <>
          <Heading eyebrow={block.eyebrow} title={block.title} tone={tone} />
          <ul className="mt-14 grid gap-4 md:grid-cols-2">
            {p.projects.map((project, i) => (
              <Reveal as="li" key={project.slug} delay={(i % 2) * 0.08}>
                <Link href={`/projetos/${project.slug}`} className={cn("group flex h-full flex-col overflow-hidden rounded-3xl ring-1 transition-shadow", dark ? "bg-white/[0.02] ring-white/10 hover:ring-white/25" : "bg-white ring-black/[0.07] hover:ring-black/20")}>
                  <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900/10">
                    {project.cover && <Image src={project.cover.src} alt={project.cover.alt} fill sizes="(min-width: 768px) 45vw, 90vw" className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]" />}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className={cn("font-mono text-[0.7rem]", dark ? "text-white/45" : "text-fg/45")}>{project.category}</p>
                    <div className="mt-2 flex items-start justify-between gap-4">
                      <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">{project.name}</h3>
                      <ArrowUpRight className="size-4 shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </div>
                    <p className={cn("mt-2 text-[0.9rem] leading-relaxed", muted)}>{project.summary}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </>,
      );
    case "gallery":
      return wrap(
        <>
          <Heading eyebrow={block.eyebrow} title={block.title} tone={tone} />
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.gallery.map((img, i) => (
              <Reveal as="li" key={`${img.src}-${i}`} delay={(i % 3) * 0.06} className={cn(i === 0 && p.gallery.length > 2 && "sm:col-span-2 lg:row-span-2")}>
                <figure className="flex h-full flex-col">
                  <div className={cn("relative overflow-hidden rounded-3xl", i === 0 && p.gallery.length > 2 ? "aspect-[4/3] lg:aspect-auto lg:min-h-0 lg:flex-1" : "aspect-[4/3]")}>
                    <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" placeholder={img.blurDataURL ? "blur" : "empty"} blurDataURL={img.blurDataURL} className="object-cover" />
                  </div>
                  {img.caption && <figcaption className={cn("mt-3 text-[0.8125rem]", dark ? "text-white/50" : "text-fg/50")}>{img.caption}</figcaption>}
                </figure>
              </Reveal>
            ))}
          </ul>
        </>,
      );
    case "testimonials":
      return wrap(
        <>
          <Heading eyebrow={block.eyebrow} title={block.title} tone={tone} />
          <ul className="mt-14 grid gap-4 md:grid-cols-2">
            {p.testimonials.map((t, i) => (
              <Reveal as="li" key={`${t.author}-${i}`} delay={(i % 2) * 0.08} className={cn("rounded-3xl p-8 ring-1", dark ? "bg-white/[0.02] ring-white/10" : "bg-white ring-black/[0.07]")}>
                <Quote className="size-5" style={{ color: "var(--accent)" }} aria-hidden="true" />
                <blockquote className="mt-5 text-[1.125rem] leading-relaxed tracking-[-0.01em] text-pretty">{t.quote}</blockquote>
                <p className="mt-6 text-[0.875rem] font-medium">{t.author}</p>
                {t.role && <p className={cn("text-[0.8125rem]", dark ? "text-white/50" : "text-fg/50")}>{t.role}</p>}
              </Reveal>
            ))}
          </ul>
        </>,
      );
    case "cta": {
      const url = block.url || p.websiteUrl;
      return (
        <section data-header="dark" className="relative isolate overflow-hidden bg-[#050507] text-white">
          <div aria-hidden="true" className="absolute top-0 left-1/2 -z-10 h-[40rem] w-[70rem] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-70" style={{ background: `radial-gradient(closest-side, color-mix(in srgb, ${p.accentColor} 30%, transparent), transparent)` }} />
          <div className="container-page py-28 text-center md:py-36">
            <Reveal>
              {block.title && <h2 className="mx-auto max-w-[18ch] text-[clamp(2.25rem,1.2rem+3.4vw,4.5rem)] leading-[0.96] font-semibold tracking-[-0.045em] text-balance">{block.title}</h2>}
              {block.body && <p className="mx-auto mt-5 max-w-[40rem] text-[1rem] leading-relaxed text-white/60">{block.body}</p>}
              <a href={url} target="_blank" rel="noopener" className="group mt-10 inline-flex h-14 items-center gap-3 rounded-full bg-white px-8 text-[1.05rem] font-semibold text-[#0b0b0e] transition-transform duration-300 hover:-translate-y-px" style={{ boxShadow: `0 20px 50px -18px ${p.accentColor}` }}>
                {block.label || visitLabel}
                <ArrowUpRight className="size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </a>
              <p className="mt-4 text-[0.8125rem] text-white/40">{websiteHost(url)}</p>
            </Reveal>
          </div>
        </section>
      );
    }
    case "explore":
      return wrap(
        <>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Heading title={block.title || "Explore More"} tone={tone} />
            <Link href="/partners#parceiros" className={cn("inline-flex items-center gap-2 text-[0.9rem] font-medium underline-offset-4 hover:underline", dark ? "text-white/80" : "text-fg/80")}>
              Explore Our Partners <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => {
              const l = o.logo ?? o.logoAlt;
              return (
                <li key={o.id}>
                  <Link href={`/partners/${o.slug}`} className={cn("group flex h-full flex-col rounded-3xl p-6 ring-1 transition-shadow", dark ? "bg-white/[0.02] ring-white/10 hover:ring-white/25" : "bg-white ring-black/[0.07] hover:ring-black/20")}>
                    <div className="flex h-12 items-center">
                      {l ? <Image src={l.src} alt={`Logotipo ${o.tradeName}`} width={l.width} height={l.height} sizes="160px" className={cn("h-9 w-auto max-w-[10rem] object-contain", dark && !o.logoAlt && "brightness-0 invert")} /> : <span className="text-[1.1rem] font-semibold">{o.tradeName}</span>}
                    </div>
                    <p className={cn("mt-5 line-clamp-2 text-[0.875rem] leading-relaxed", muted)}>{o.shortDescription}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[0.8125rem] font-medium">
                      {o.tradeName}
                      <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>,
      );
  }
}
