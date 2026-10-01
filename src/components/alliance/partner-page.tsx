import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import type { PageBlock } from "@/lib/alliance/page-blocks";
import type { DirectoryCard, PublicPartner } from "@/lib/alliance/types";
import { cn } from "@/lib/utils";
import { TierBadge } from "./tier-badge";
import { AllianceMark } from "./alliance-logo";

/**
 * Página exclusiva de um parceiro (/partners/[slug]). Tudo vem do CMS (perfil publicado e blocos);
 * blocos sem conteúdo não aparecem, então nada é inventado.
 *
 * Desenho editorial: o produto do parceiro aparece já na abertura (primeira imagem da galeria), o
 * corpo é uma página clara contínua com seções separadas por linhas finas e um índice à esquerda, e
 * cada tipo de bloco tem forma própria (texto de abertura em destaque, lista de serviços, vitrine
 * escura de imagens, selo da parceria, citação principal). A cor do parceiro aparece em poucos pontos.
 */

type Props = { partner: PublicPartner; modalityNames: Record<string, string>; tierName: string | null; others: DirectoryCard[] };

const websiteHost = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export function PartnerPage({ partner: p, modalityNames, tierName, others }: Props) {
  const accent = p.accentColor;
  const logo = p.logoAlt ?? p.logo;
  const visitLabel = `Visitar o site da ${p.tradeName}`;
  const blocks = p.page.blocks.filter((b) => b.visible && hasContent(b, p, others));
  const showcase = p.gallery[0] ?? p.og ?? null;
  const modalities = p.modalities.map((m) => modalityNames[m] ?? m);
  let index = 0;

  return (
    <article style={{ ["--accent" as string]: accent }}>
      {/* Abertura: quem é, o que faz e o produto, lado a lado. */}
      <section data-header="dark" aria-labelledby="partner-title" className="relative isolate overflow-hidden bg-[#060708] text-white">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-px bg-white/10" />
        <div className="container-page pt-[calc(var(--header-height)+2.5rem)] pb-16 md:pb-24">
          <Link href="/partners#parceiros" className="inline-flex items-center gap-2 text-[0.8125rem] text-white/55 transition-colors hover:text-white">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <AllianceMark accent className="h-4 text-white" />
            Rocket Alliance
          </Link>

          <div className="mt-12 grid items-center gap-14 lg:mt-16 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <div className="flex animate-[fade-up_900ms_var(--ease-out)_both] items-center gap-5" aria-label={`Rocket Alliance e ${p.tradeName}`}>
                <AllianceMark accent className="h-8 text-white" />
                <span aria-hidden="true" className="text-[1.1rem] font-light text-white/30">
                  ×
                </span>
                {logo ? (
                  <Image src={logo.src} alt={logo.alt || `Logotipo ${p.tradeName}`} width={logo.width} height={logo.height} sizes="240px" priority className={cn("h-9 w-auto max-w-[13rem] object-contain sm:h-10", !p.logoAlt && "brightness-0 invert")} />
                ) : (
                  <span className="text-[1.5rem] font-semibold tracking-[-0.03em]">{p.tradeName}</span>
                )}
              </div>

              <h1 id="partner-title" className="mt-10 max-w-[17ch] animate-[fade-up_900ms_var(--ease-out)_120ms_both] text-[clamp(2.4rem,1.2rem+3.6vw,4.4rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-balance">
                {p.page.hero.title || p.tradeName}
              </h1>
              {(p.page.hero.subtitle || p.shortDescription) && (
                <p className="mt-6 max-w-[36rem] animate-[fade-up_900ms_var(--ease-out)_240ms_both] text-[1.0625rem] leading-relaxed text-pretty text-white/65">{p.page.hero.subtitle || p.shortDescription}</p>
              )}

              <div className="mt-9 flex animate-[fade-up_900ms_var(--ease-out)_360ms_both] flex-wrap items-center gap-3">
                {p.websiteUrl && (
                  <a href={p.websiteUrl} target="_blank" rel="noopener" className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[0.95rem] font-semibold text-[#0b0b0e] transition-transform duration-300 hover:-translate-y-px">
                    {visitLabel}
                    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </a>
                )}
                {modalities.map((m) => (
                  <span key={m} className="inline-flex h-12 items-center rounded-full px-5 text-[0.875rem] text-white/75 ring-1 ring-white/15">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {showcase && (
              <div className="relative animate-[fade-up_1100ms_var(--ease-out)_300ms_both] lg:col-span-6">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[#0d0f12] ring-1 ring-white/10">
                  <Image src={showcase.src} alt={showcase.alt} fill priority sizes="(min-width: 1024px) 46vw, 92vw" placeholder={showcase.blurDataURL ? "blur" : "empty"} blurDataURL={showcase.blurDataURL} className="object-cover" />
                </div>
                {tierName && p.tierKey && (
                  <div className="absolute -bottom-8 -left-6 sm:-left-10">
                    <TierBadge tier={p.tierKey} size={132} detailed title={`Selo ${tierName}`} className="drop-shadow-[0_24px_40px_rgb(0_0_0/0.6)]" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Facts partner={p} tierName={tierName} />
      </section>

      {blocks.map((block) => {
        const numbered = block.kind !== "cta" && block.kind !== "gallery" && block.kind !== "explore";
        return <Block key={block.id} block={block} partner={p} index={numbered ? ++index : null} others={others} visitLabel={visitLabel} modalities={modalities} tierName={tierName} />;
      })}
    </article>
  );
}

/** Ficha do parceiro, na base da abertura: texto simples, sem rótulos em código. */
function Facts({ partner: p, tierName }: { partner: PublicPartner; tierName: string | null }) {
  const items = [
    p.sector && { label: "Setor", value: p.sector },
    tierName && { label: "Nível", value: tierName, tier: p.tierKey },
    p.location && { label: "Sede", value: p.location },
    p.websiteUrl && { label: "Site", value: websiteHost(p.websiteUrl), href: p.websiteUrl },
  ].filter(Boolean) as { label: string; value: string; href?: string; tier?: string | null }[];
  if (items.length === 0) return null;
  return (
    <div className="border-t border-white/[0.08]">
      <dl className="container-page grid grid-cols-2 gap-y-6 py-8 md:grid-cols-4">
        {items.map((f) => (
          <div key={f.label} className="pr-4">
            <dt className="text-[0.8125rem] text-white/45">{f.label}</dt>
            <dd className="mt-1.5 flex items-center gap-2.5 text-[1rem] text-white">
              {f.tier && <TierBadge tier={f.tier} size={36} />}
              {f.href ? (
                <a href={f.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline decoration-white/25 underline-offset-4 hover:decoration-white">
                  {f.value}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              ) : (
                f.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
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

/** Seção clara do corpo: índice e título à esquerda, conteúdo à direita, linha fina em cima. */
function Chapter({ index, eyebrow, title, children, wide = false }: { index: number | null; eyebrow?: string; title?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className="tone-light bg-tone text-fg">
      <div className="container-page">
        <div className="grid gap-10 border-t border-fg/10 py-20 md:py-28 lg:grid-cols-12 lg:gap-12">
          <Reveal className={cn(wide ? "lg:col-span-12" : "lg:col-span-4")}>
            <p className="text-[0.8125rem] text-fg/45 tabular-nums">
              {index !== null && <span className="mr-3 text-fg/30">{String(index).padStart(2, "0")}</span>}
              {eyebrow}
            </p>
            {title && <h2 className={cn("mt-3 text-[clamp(1.75rem,1.2rem+1.6vw,2.6rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance", wide && "max-w-[22ch]")}>{title}</h2>}
          </Reveal>
          <div className={cn(wide ? "lg:col-span-12" : "lg:col-span-7 lg:col-start-6")}>{children}</div>
        </div>
      </div>
    </section>
  );
}

function Block({
  block,
  partner: p,
  index,
  others,
  visitLabel,
  modalities,
  tierName,
}: {
  block: PageBlock;
  partner: PublicPartner;
  index: number | null;
  others: DirectoryCard[];
  visitLabel: string;
  modalities: string[];
  tierName: string | null;
}) {
  switch (block.kind) {
    case "text": {
      const body = block.body || (block.id === "default-about" ? p.description : "");
      const [lead, ...rest] = paragraphs(body);
      // "Nossa parceria" ganha o selo do nível: é o momento do programa na página.
      if (block.id === "default-partnership") {
        return (
          <Chapter index={index} eyebrow={block.eyebrow || "Rocket Alliance"} title={block.title}>
            <Reveal y={24} className="flex flex-col gap-8 sm:flex-row sm:items-center">
              {tierName && p.tierKey && <TierBadge tier={p.tierKey} size={168} detailed title={`Selo ${tierName}`} className="drop-shadow-[0_18px_36px_rgb(0_0_0/0.18)]" />}
              <div className="space-y-4">
                <p className="text-[1.375rem] leading-snug tracking-[-0.02em] text-pretty text-fg">{lead}</p>
                {rest.map((para) => (
                  <p key={para.slice(0, 40)} className="text-[1rem] leading-relaxed text-fg/60">
                    {para}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  {[...modalities, tierName].filter(Boolean).map((label) => (
                    <span key={label} className="rounded-full bg-fg/[0.05] px-3.5 py-1.5 text-[0.8125rem] text-fg/75">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </Chapter>
        );
      }
      return (
        <Chapter index={index} eyebrow={block.eyebrow} title={block.title}>
          <Reveal y={24}>
            {lead && <p className="text-[clamp(1.25rem,1.05rem+0.6vw,1.6rem)] leading-[1.4] tracking-[-0.02em] text-pretty text-fg">{lead}</p>}
            {rest.length > 0 && (
              <div className="mt-8 max-w-[40rem] space-y-5 text-[1rem] leading-relaxed text-pretty text-fg/65">
                {rest.map((para) => (
                  <p key={para.slice(0, 40)}>{para}</p>
                ))}
              </div>
            )}
          </Reveal>
        </Chapter>
      );
    }
    case "expertise":
      return (
        <Chapter index={index} eyebrow={block.eyebrow} title={block.title}>
          <Reveal y={24}>
            {p.services.length > 0 && (
              <ul className="grid gap-x-10 sm:grid-cols-2">
                {p.services.map((s) => (
                  <li key={s} className="flex items-start gap-3 border-b border-fg/10 py-4 text-[1rem] text-fg/85">
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: "var(--accent)" }} strokeWidth={2.2} aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
            {p.specialties.length > 0 && (
              <div className={cn(p.services.length > 0 && "mt-10")}>
                <p className="text-[0.8125rem] text-fg/45">Especialidades</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {p.specialties.map((s) => (
                    <li key={s} className="rounded-full bg-fg/[0.05] px-3.5 py-1.5 text-[0.875rem] text-fg/80">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>
        </Chapter>
      );
    case "projects":
      return (
        <Chapter index={index} eyebrow={block.eyebrow} title={block.title}>
          <ul className="grid gap-6 sm:grid-cols-2">
            {p.projects.map((project, i) => (
              <Reveal as="li" key={project.slug} delay={(i % 2) * 0.08}>
                <Link href={`/projetos/${project.slug}`} className="group block">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-fg/[0.04]">
                    {project.cover && <Image src={project.cover.src} alt={project.cover.alt} fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]" />}
                  </div>
                  <p className="mt-4 text-[0.8125rem] text-fg/45">{project.category}</p>
                  <h3 className="mt-1 flex items-center gap-1.5 text-[1.1rem] font-semibold tracking-[-0.02em]">
                    {project.name}
                    <ArrowUpRight className="size-4 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </h3>
                  <p className="mt-1.5 text-[0.9rem] leading-relaxed text-fg/60">{project.summary}</p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </Chapter>
      );
    case "gallery": {
      // A imagem da abertura não se repete logo em seguida.
      const images = p.gallery.length > 1 ? p.gallery.slice(1) : p.gallery;
      return (
        <section data-header="dark" className="bg-[#060708] text-white">
          <div className="container-page py-20 md:py-28">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <div>
                {block.eyebrow && <p className="text-[0.8125rem] text-white/45">{block.eyebrow}</p>}
                {block.title && <h2 className="mt-3 max-w-[20ch] text-[clamp(1.75rem,1.2rem+1.6vw,2.6rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">{block.title}</h2>}
              </div>
            </Reveal>
            <ul className={cn("mt-12 grid gap-5", images.length >= 4 ? "sm:grid-cols-2" : images.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2")}>
              {images.map((img, i) => (
                <Reveal as="li" key={`${img.src}-${i}`} delay={(i % 2) * 0.06}>
                  <figure>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08]">
                      <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 45vw, 92vw" placeholder={img.blurDataURL ? "blur" : "empty"} blurDataURL={img.blurDataURL} className="object-cover transition-transform duration-700 hover:scale-[1.02]" />
                    </div>
                    {img.caption && <figcaption className="mt-3 text-[0.875rem] text-white/55">{img.caption}</figcaption>}
                  </figure>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      );
    }
    case "testimonials": {
      const [first, ...rest] = p.testimonials;
      return (
        <Chapter index={index} eyebrow={block.eyebrow} title={block.title} wide>
          <Reveal y={24}>
            <figure className="max-w-[54rem]">
              <blockquote className="font-serif text-[clamp(1.6rem,1.1rem+1.7vw,2.6rem)] leading-[1.2] tracking-[-0.01em] text-pretty text-fg italic">“{first.quote}”</blockquote>
              <figcaption className="mt-6 text-[0.9375rem]">
                <span className="font-medium text-fg">{first.author}</span>
                {first.role && <span className="text-fg/50"> · {first.role}</span>}
              </figcaption>
            </figure>
          </Reveal>
          {rest.length > 0 && (
            <ul className={cn("mt-16 grid gap-x-10 gap-y-10", rest.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
              {rest.map((t, i) => (
                <Reveal as="li" key={`${t.author}-${i}`} delay={(i % 3) * 0.06} className="border-t border-fg/10 pt-6">
                  <blockquote className="text-[1rem] leading-relaxed text-pretty text-fg/80">“{t.quote}”</blockquote>
                  <p className="mt-4 text-[0.875rem] font-medium text-fg">{t.author}</p>
                  {t.role && <p className="text-[0.8125rem] text-fg/50">{t.role}</p>}
                </Reveal>
              ))}
            </ul>
          )}
        </Chapter>
      );
    }
    case "cta": {
      const url = block.url || p.websiteUrl;
      return (
        <section data-header="dark" className="bg-[#060708] text-white">
          <div className="container-page">
            <Reveal className="grid gap-10 border-t border-white/10 py-20 md:grid-cols-12 md:items-end md:py-24">
              <div className="md:col-span-7">
                {logo(p) && <Image src={logo(p)!.src} alt="" width={logo(p)!.width} height={logo(p)!.height} sizes="200px" className={cn("mb-8 h-8 w-auto max-w-[12rem] object-contain", !p.logoAlt && "brightness-0 invert")} />}
                <h2 className="max-w-[18ch] text-[clamp(2rem,1.2rem+2.6vw,3.6rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance">{block.title || `Conheça a ${p.tradeName}`}</h2>
                {block.body && <p className="mt-5 max-w-[34rem] text-[1rem] leading-relaxed text-white/60">{block.body}</p>}
              </div>
              <div className="flex flex-col items-start gap-3 md:col-span-5 md:items-end">
                <a href={url} target="_blank" rel="noopener" className="group inline-flex h-14 items-center gap-3 rounded-full bg-white px-7 text-[1rem] font-semibold text-[#0b0b0e] transition-transform duration-300 hover:-translate-y-px">
                  {block.label || visitLabel}
                  <ArrowUpRight className="size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </a>
                <p className="text-[0.8125rem] text-white/40">{websiteHost(url)}</p>
              </div>
            </Reveal>
          </div>
        </section>
      );
    }
    case "explore":
      return (
        <section className="tone-light bg-tone text-fg">
          <div className="container-page py-20 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="text-[clamp(1.5rem,1.1rem+1.2vw,2.1rem)] leading-[1.1] font-semibold tracking-[-0.035em]">{block.title || "Conheça outros parceiros"}</h2>
              <Link href="/partners#parceiros" className="inline-flex items-center gap-2 text-[0.9rem] font-medium text-fg/75 underline-offset-4 hover:text-fg hover:underline">
                Ver todos os parceiros <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-10 border-t border-fg/10">
              {others.map((o) => {
                const l = o.logo ?? o.logoAlt;
                return (
                  <li key={o.id} className="border-b border-fg/10">
                    <Link href={`/partners/${o.slug}`} className="group grid items-center gap-4 py-6 sm:grid-cols-[12rem_1fr_auto]">
                      <span className="flex h-10 items-center">
                        {l ? <Image src={l.src} alt={`Logotipo ${o.tradeName}`} width={l.width} height={l.height} sizes="160px" className="h-8 w-auto max-w-[10rem] object-contain" /> : <span className="text-[1.1rem] font-semibold">{o.tradeName}</span>}
                      </span>
                      <span className="text-[0.9375rem] leading-relaxed text-fg/60">{o.shortDescription}</span>
                      <span className="inline-flex items-center gap-3">
                        {o.tierKey && <TierBadge tier={o.tierKey} size={40} />}
                        <ArrowUpRight className="size-5 text-fg/35 transition-[transform,color] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      );
  }
}

const logo = (p: PublicPartner) => p.logoAlt ?? p.logo;
