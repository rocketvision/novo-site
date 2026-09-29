"use client";

import { useEffect, useMemo, useRef } from "react";
import { cubicBezier, m, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ChatBubble, FileCard, SearchCard, StickyNote, shadow } from "@/components/visuals/primitives";
import type { Resolved } from "@/lib/content/resolved";
import { useMediaQuery, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { lerp } from "@/lib/scroll";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CAMERA_TRAVEL, FEATURED_DEPTHS, buildCloud, gridSlot, type CloudItem } from "./hero-cloud";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;
const easeInOut = cubicBezier(...ease.inOut);

type Content = { hero: Resolved<"hero">; problem: Resolved<"problem"> };

/** Momentos da cena, em progresso do scroll (0 a 1). */
const T = {
  textOut: [0.05, 0.14],
  dive: [0.1, 0.62],
  captions: [0.13, 0.17],
  conclusion: [0.58, 0.63, 0.7, 0.74],
  line: [0.74, 0.8],
  snap: [0.76, 0.92],
  fade: [0.92, 1],
} as const;

/** Profundidade do plano da grade depois do mergulho, em relação à câmera. */
const GRID_DEPTH = -1050;

/**
 * Cena de abertura.
 *
 * 1. A promessa ocupa a tela; atrás dela, em profundidade, a nuvem de improvisos
 *    de um negócio que cresceu sem sistema (planilhas, mensagens, post-its, comandas).
 * 2. Com o scroll, a câmera mergulha na nuvem. Os objetos passam pelo visitante
 *    e cada improviso da copy entra em foco com a sua frase.
 * 3. "Sua empresa cresceu. As ferramentas dela, não."
 * 4. O traço laranja (o rumo) corta a tela e tudo se encaixa numa grade:
 *    o caos vira sistema, e a cena entrega o palco para O que muda.
 */
export function HeroScene(content: Content) {
  const reduceMotion = usePrefersReducedMotion();
  return reduceMotion ? <StaticHero {...content} /> : <AnimatedHero {...content} />;
}

function HeroText({ hero }: { hero: Resolved<"hero"> }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-eyebrow animate-fade-up text-white/55" style={delay(0)}>
        {hero.eyebrow}
      </p>
      <h1 className="text-hero mt-6 text-white">
        {hero.titleLines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-[0.06em]">
            <span className="animate-rise block" style={delay(80 + i * 90)}>
              {line}
            </span>
          </span>
        ))}
      </h1>
      <p className="animate-fade-up mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-white/65 lg:text-lg" style={delay(420)}>
        {hero.lead}
      </p>
      <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3" style={delay(540)}>
        <ButtonLink href={hero.primaryCta.href} variant="inverse" size="lg" icon={<ArrowRight className="size-4" />}>
          {hero.primaryCta.label}
        </ButtonLink>
        <a href={hero.secondaryCta.href} className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-white/80">
          <span className="link-underline">{hero.secondaryCta.label}</span>
          <ArrowDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
        </a>
      </div>
    </div>
  );
}

/** Um improviso, desenhado com as mesmas peças do resto da página. */
function CloudCard({ item }: { item: CloudItem }) {
  switch (item.kind) {
    case "file":
      return <FileCard name={item.text} meta={item.meta} />;
    case "chat":
      return <ChatBubble text={item.text} meta={item.featured !== undefined ? item.meta : undefined} time={item.featured !== undefined ? undefined : item.meta} />;
    case "search":
      return <SearchCard query={item.text} meta={item.meta} />;
    case "note":
      return <StickyNote text={item.text} />;
    case "receipt":
      return (
        <div className={cn("w-[11em] bg-[#fbfaf6] px-[1em] pt-[0.9em] pb-[1.2em] font-mono text-[#2b2a26]", shadow)}>
          <p className="text-[0.8em] font-semibold tracking-wide uppercase">{item.text}</p>
          <p className="mt-[0.6em] border-t border-dashed border-black/20 pt-[0.6em] text-[0.72em] leading-snug">{item.meta}</p>
        </div>
      );
  }
}

function AnimatedHero({ hero, problem }: Content) {
  const sectionRef = useRef<HTMLElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const progress = useScrollProgress(sectionRef, ["start start", "end end"]);

  const items = useMemo(
    () =>
      buildCloud(
        problem.symptoms.map((s) => ({ kind: s.kind, text: s.artifact, meta: s.meta })),
        isDesktop ? { count: 44, spread: 1000 } : { count: 18, spread: 560 },
      ),
    [problem.symptoms, isDesktop],
  );

  // A câmera: parada no início, mergulha na nuvem e para diante do plano da grade.
  const camera = useTransform(progress, [T.dive[0], T.dive[1]], [0, CAMERA_TRAVEL], { ease: easeInOut });
  const snap = useTransform(progress, [T.snap[0], T.snap[1]], [0, 1], { ease: easeInOut });

  // Leve paralaxe com o ponteiro (só desktop): a nuvem responde ao movimento do mouse.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tiltX = useSpring(pointerY, { stiffness: 40, damping: 18 });
  const tiltY = useSpring(pointerX, { stiffness: 40, damping: 18 });
  useEffect(() => {
    if (!isDesktop) return;
    const onMove = (e: PointerEvent) => {
      pointerX.set((e.clientX / window.innerWidth - 0.5) * 6);
      pointerY.set((0.5 - e.clientY / window.innerHeight) * 4);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [isDesktop, pointerX, pointerY]);

  const world = useTransform(() => `translateZ(${camera.get()}px) rotateX(${tiltX.get()}deg) rotateY(${tiltY.get()}deg)`);

  const textOpacity = useTransform(progress, [T.textOut[0], T.textOut[1]], [1, 0]);
  const textScale = useTransform(progress, [0, T.textOut[1]], [1, 0.92]);
  const textY = useTransform(progress, [0, T.textOut[1]], [0, -40]);
  const lineScale = useTransform(progress, [T.line[0], T.line[1]], [0, 1], { ease: easeInOut });
  const lineOpacity = useTransform(progress, [T.line[0], T.line[0] + 0.01, 0.88, 0.94], [0, 1, 1, 0]);
  const fade = useTransform(progress, [T.fade[0], T.fade[1]], [0, 0.85]);

  const cols = isDesktop ? 8 : 4;
  const cell = isDesktop ? { w: 330, h: 210 } : { w: 190, h: 170 };

  return (
    <section ref={sectionRef} id="inicio" data-header="dark" className="relative h-[420vh] bg-ink lg:h-[520vh]">
      <h2 className="sr-only">{[problem.eyebrow, ...problem.symptoms.map((s) => s.text), ...problem.conclusion].join(" ")}</h2>

      <div className="sticky top-0 h-svh overflow-hidden [perspective:1000px]">
        {/* Brilho quente no fundo: a luz da cena. */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgb(255_91_31/0.12),transparent_70%)]" />

        <m.div style={{ transform: world }} className="absolute inset-0 [transform-style:preserve-3d]" aria-hidden="true">
          {items.map((item, i) => (
            <CloudObject
              key={i}
              item={item}
              camera={camera}
              snap={snap}
              slot={gridSlot(i, items.length, cols, cell)}
              fontSize={isDesktop ? 14 : 10}
            />
          ))}
        </m.div>

        {/* Vinheta que protege a leitura da promessa. */}
        <m.div
          style={{ opacity: textOpacity }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(95%_55%_at_50%_52%,rgb(10_10_11/0.96),rgb(10_10_11/0.5)_75%,transparent)] lg:bg-[radial-gradient(55%_45%_at_50%_50%,rgb(10_10_11/0.92),rgb(10_10_11/0.35)_70%,transparent)]"
        />
        <m.div
          style={{ opacity: textOpacity, scale: textScale, y: textY }}
          className="container-page absolute inset-0 flex items-center justify-center pt-(--header-height)"
        >
          <HeroText hero={hero} />
        </m.div>

        <Captions problem={problem} camera={camera} progress={progress} />

        {/* O rumo: o traço laranja que corta a tela antes de tudo se organizar. */}
        <m.div
          style={{ scaleX: lineScale, opacity: lineOpacity }}
          className="absolute top-1/2 left-0 h-[2px] w-full origin-left bg-accent shadow-[0_0_24px_4px_rgb(255_91_31/0.55)]"
          aria-hidden="true"
        />

        <m.div style={{ opacity: fade }} className="pointer-events-none absolute inset-0 bg-ink" />
      </div>
    </section>
  );
}

function CloudObject({
  item,
  camera,
  snap,
  slot,
  fontSize,
}: {
  item: CloudItem;
  camera: MotionValue<number>;
  snap: MotionValue<number>;
  slot: { x: number; y: number };
  fontSize: number;
}) {
  // Plano da grade: diante da câmera quando o mergulho termina.
  const gridZ = GRID_DEPTH - CAMERA_TRAVEL;

  const transform = useTransform(() => {
    const s = snap.get();
    const x = lerp(item.x, slot.x, s);
    const y = lerp(item.y, slot.y, s);
    const z = lerp(item.z, gridZ, s);
    const scale = lerp(item.scale, 0.9, s);
    return `translate3d(${x}px, ${y}px, ${z}px) rotateX(${lerp(item.rx, 0, s)}deg) rotateY(${lerp(item.ry, 0, s)}deg) rotateZ(${lerp(item.rz, 0, s)}deg) scale(${scale})`;
  });

  // Névoa: longe fica escuro; perto demais some antes de atravessar a câmera.
  const opacity = useTransform(() => {
    const s = snap.get();
    const depth = lerp(item.z, gridZ, s) + camera.get();
    const near = depth > 150 ? Math.max(0, 1 - (depth - 150) / 250) : 1;
    const far = Math.min(1, Math.max(0.12, (depth + 4800) / 3000));
    return Math.max(near * far, s * 0.95);
  });

  return (
    <m.div style={{ transform, opacity }} className="absolute top-1/2 left-1/2 [transform-style:preserve-3d]">
      <div className="-translate-x-1/2 -translate-y-1/2" style={{ fontSize }}>
        <div className="animate-drift" style={{ "--drift": `${item.drift}s` } as React.CSSProperties}>
          <CloudCard item={item} />
        </div>
      </div>
    </m.div>
  );
}

/** As frases do problema: cada uma entra em foco quando a câmera passa pelo seu objeto. */
function Captions({ problem, camera, progress }: { problem: Resolved<"problem">; camera: MotionValue<number>; progress: MotionValue<number> }) {
  const eyebrowOpacity = useTransform(camera, [250, 550, 2750, 3000], [0, 1, 1, 0]);
  // As frases só entram depois que a promessa saiu de cena.
  const gate = useTransform(progress, [T.captions[0], T.captions[1], T.line[0], T.line[1]], [0, 1, 1, 0]);
  // Durante a conclusão, a nuvem recua para a frase respirar.
  const dim = useTransform(progress, [T.conclusion[0], T.conclusion[1], T.conclusion[2], T.conclusion[3]], [0, 0.7, 0.7, 0]);
  const conclusionOpacity = useTransform(progress, [...T.conclusion], [0, 1, 1, 0]);
  const conclusionY = useTransform(progress, [T.conclusion[0], T.conclusion[1]], [30, 0]);

  return (
    <m.div style={{ opacity: gate }} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-x-0 bottom-0 h-[40svh] bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      <m.div style={{ opacity: dim }} className="absolute inset-0 bg-ink" />
      <m.div style={{ opacity: eyebrowOpacity }} className="absolute inset-x-0 top-[calc(var(--header-height)+2rem)] text-center">
        <Eyebrow className="text-white/55">{problem.eyebrow}</Eyebrow>
      </m.div>
      {problem.symptoms.map((symptom, i) => (
        <Caption key={i} text={symptom.text} depth={FEATURED_DEPTHS[i] ?? -1100 - i * 700} camera={camera} />
      ))}
      <m.div style={{ opacity: conclusionOpacity, y: conclusionY }} className="absolute inset-0 flex items-center justify-center px-6">
        <p className="max-w-4xl text-center text-[clamp(2.25rem,1rem+4vw,5rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-white">
          {problem.conclusion[0]}
          <br />
          <span className="text-accent">{problem.conclusion[1]}</span>
        </p>
      </m.div>
    </m.div>
  );
}

function Caption({ text, depth, camera }: { text: string; depth: number; camera: MotionValue<number> }) {
  // Em foco quando o objeto está a cerca de 700 px da câmera.
  const focus = -depth - 700;
  const opacity = useTransform(camera, [focus - 420, focus - 180, focus + 160, focus + 380], [0, 1, 1, 0]);
  const y = useTransform(camera, [focus - 420, focus + 380], [24, -24]);
  return (
    <m.p
      style={{ opacity, y }}
      className="absolute inset-x-0 bottom-[14svh] px-6 text-center text-[clamp(1.5rem,1rem+2vw,2.75rem)] leading-tight font-semibold tracking-[-0.03em] text-white"
    >
      {text}
    </m.p>
  );
}

/** Versão para prefers-reduced-motion: a mesma narrativa, sem movimento. */
function StaticHero({ hero, problem }: Content) {
  const items = buildCloud(
    problem.symptoms.map((s) => ({ kind: s.kind, text: s.artifact, meta: s.meta })),
    { count: 0, spread: 0 },
  );
  return (
    <section id="inicio" data-header="dark" className="bg-ink pt-[calc(var(--header-height)+4rem)] pb-28 text-white">
      <div className="container-page">
        <HeroText hero={hero} />
        <div className="mt-20 grid gap-6 text-[12px] sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {items.map((item, i) => (
            <div key={i} className="flex justify-center">
              <CloudCard item={item} />
            </div>
          ))}
        </div>
        <div className="mt-20">
          <Eyebrow className="text-white/60">{problem.eyebrow}</Eyebrow>
          <ul className="mt-8 grid gap-3 text-lg text-white/75 sm:grid-cols-2">
            {problem.symptoms.map((symptom, i) => (
              <li key={i}>{symptom.text}</li>
            ))}
          </ul>
          <p className="text-title mt-10">
            {problem.conclusion[0]} <span className="text-accent">{problem.conclusion[1]}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

