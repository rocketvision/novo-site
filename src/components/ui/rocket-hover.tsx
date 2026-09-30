"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Vida no quadro final da abertura, depois que o foguete para de subir.
 *
 * Um canvas por cima do vídeo parado, alinhado ao quadro (mesmo `object-fit: cover` do vídeo):
 * - o motor continua aceso: um brilho azul que respira e cintila como chama;
 * - partículas de luz saem do motor e descem pelo rastro, apagando aos poucos;
 * - algumas estrelas piscam devagar no céu;
 * - o slogan surge à direita, abaixo do foguete, como se estivesse na cena (só em telas a partir de 1200 px).
 *
 * Com mouse, a cena responde ao cursor, sempre de leve: uma luz azul suave o acompanha, as estrelas
 * perto dele brilham e o céu ganha profundidade, as partículas do rastro se afastam quando ele passa
 * e o motor "acelera" (mais brilho e mais partículas) quando ele chega perto.
 *
 * Só desenha enquanto a abertura está na tela e a aba está visível. Com movimento reduzido,
 * o componente nem é montado (a abertura mostra a imagem parada).
 */

/** Quadro 16:9 (2560 × 1440) e recorte vertical 3:4 (1080 × 1440, a partir de x = 1360). */
const FRAMES = {
  landscape: { w: 2560, h: 1440, dx: 0 },
  portrait: { w: 1080, h: 1440, dx: 1360 },
} as const;

const PORTRAIT = "(orientation: portrait) and (max-width: 1024px)";

/** Motor e caminho do rastro, em pixels do quadro 16:9 (medidos no último quadro do vídeo). */
const ENGINE = { x: 1905, y: 458 };
const TRAIL = [
  { x: 1905, y: 458 },
  { x: 1782, y: 648 },
  { x: 1615, y: 792 },
  { x: 1523, y: 936 },
  { x: 1462, y: 1080 },
];

/** Alcance das interações com o cursor, em px de tela. */
const REACH = { light: 280, stars: 170, trail: 120, engine: 240 };

/** Estrelas fixas no céu (pixels do quadro 16:9), longe do texto e do foguete. */
const STARS = Array.from({ length: 34 }, (_, i) => {
  // Distribuição determinística: o mesmo céu em todo carregamento.
  const r = (n: number) => {
    const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  return { x: 900 + r(1) * 1640, y: 30 + r(2) * 780, size: 0.6 + r(3) * 1.1, phase: r(4) * Math.PI * 2, speed: 0.35 + r(5) * 0.9, depth: 0.3 + r(6) * 0.7 };
}).filter((s) => Math.hypot(s.x - ENGINE.x, s.y - ENGINE.y) > 220);

/** Canto superior esquerdo do slogan no quadro 16:9: à direita do rastro, abaixo do corpo do foguete. */
const SLOGAN = { x: 2000, y: 560 };

type Particle = { born: number; life: number; offset: number; wobble: number; size: number };

/** Ponto ao longo do rastro (0 = motor, 1 = fim do rastro), com a tangente para o desvio lateral. */
function trailAt(t: number) {
  const segments = TRAIL.length - 1;
  const f = Math.min(segments - 1e-6, Math.max(0, t * segments));
  const i = Math.floor(f);
  const k = f - i;
  const a = TRAIL[i];
  const b = TRAIL[i + 1];
  const tx = b.x - a.x;
  const ty = b.y - a.y;
  const len = Math.hypot(tx, ty) || 1;
  return { x: a.x + tx * k, y: a.y + ty * k, nx: -ty / len, ny: tx / len };
}

export function RocketHover({ active, className }: { active: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sloganRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const portraitQuery = window.matchMedia(PORTRAIT);
    let frame: (typeof FRAMES)[keyof typeof FRAMES] = FRAMES.landscape;
    // Mapeamento quadro → canvas com object-fit: cover centralizado.
    let scale = 1;
    let ox = 0;
    let oy = 0;
    let dpr = 1;

    const resize = () => {
      // Meia resolução: são brilhos suaves, e o custo por quadro cai para um quarto.
      dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      // Tamanho de layout (sem o push-in): o canvas desenha no mesmo espaço do vídeo.
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      frame = portraitQuery.matches ? FRAMES.portrait : FRAMES.landscape;
      scale = Math.max(width / frame.w, height / frame.h);
      ox = (width - frame.w * scale) / 2;
      oy = (height - frame.h * scale) / 2;
      if (sloganRef.current) {
        sloganRef.current.style.left = `${(SLOGAN.x - frame.dx) * scale + ox}px`;
        sloganRef.current.style.top = `${SLOGAN.y * scale + oy}px`;
      }
    };
    const toCanvas = (x: number, y: number) => ({ x: ((x - frame.dx) * scale + ox) * dpr, y: (y * scale + oy) * dpr });

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    portraitQuery.addEventListener("change", resize);

    // Brilho de uma partícula, desenhado uma vez: cada quadro só carimba o sprite.
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const sctx = sprite.getContext("2d")!;
    const sg = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sg.addColorStop(0, "rgba(210, 235, 255, 0.9)");
    sg.addColorStop(0.35, "rgba(90, 170, 255, 0.45)");
    sg.addColorStop(1, "rgba(40, 110, 255, 0)");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 64, 64);

    // Cursor em px do canvas; `presence` e a posição suavizada evitam saltos quando ele entra ou sai.
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const pointer = { x: 0, y: 0, inside: false, sx: 0, sy: 0, presence: 0, engine: 0 };
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (canvas.height / rect.height);
      const inside = x >= 0 && y >= 0 && x <= canvas.width && y <= canvas.height;
      if (inside && pointer.presence < 0.01) {
        pointer.sx = x;
        pointer.sy = y;
      }
      Object.assign(pointer, { x, y, inside });
    };
    const onLeave = () => (pointer.inside = false);
    if (finePointer) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    const approach = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt));

    const particles: Particle[] = [];
    let raf = 0;
    let running = false;
    let last = performance.now();
    let spawn = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      // 30 quadros por segundo bastam para brilhos e partículas lentas.
      if (now - last < 1000 / 31) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const unit = scale * dpr; // 1 px do quadro em px do canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      // Cursor: presença e posição suavizadas; perto do motor, ele "acelera".
      pointer.presence = approach(pointer.presence, pointer.inside ? 1 : 0, 3.5, dt);
      pointer.sx = approach(pointer.sx, pointer.x, 9, dt);
      pointer.sy = approach(pointer.sy, pointer.y, 9, dt);
      const engine = toCanvas(ENGINE.x, ENGINE.y);
      const near = (x: number, y: number, reach: number) => pointer.presence * Math.exp(-(((x - pointer.sx) ** 2 + (y - pointer.sy) ** 2) / (reach * dpr) ** 2));
      pointer.engine = approach(pointer.engine, near(engine.x, engine.y, REACH.engine), 4, dt);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Luz do cursor: um brilho azul muito suave, como se iluminasse o espaço.
      if (pointer.presence > 0.01) {
        const lr = REACH.light * dpr;
        const light = ctx.createRadialGradient(pointer.sx, pointer.sy, 0, pointer.sx, pointer.sy, lr);
        light.addColorStop(0, `rgba(90, 160, 255, ${0.09 * pointer.presence})`);
        light.addColorStop(1, "rgba(90, 160, 255, 0)");
        ctx.fillStyle = light;
        ctx.fillRect(pointer.sx - lr, pointer.sy - lr, lr * 2, lr * 2);
      }

      // Estrelas piscando; perto do cursor brilham mais, e o céu se desloca de leve (profundidade).
      for (const s of STARS) {
        const base = toCanvas(s.x, s.y);
        const px = base.x - ((pointer.sx - cx) / cx) * 14 * dpr * s.depth * pointer.presence;
        const py = base.y - ((pointer.sy - cy) / cy) * 10 * dpr * s.depth * pointer.presence;
        const boost = near(px, py, REACH.stars);
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed * 2 + s.phase);
        ctx.fillStyle = `rgba(200, 225, 255, ${Math.min(1, 0.08 + 0.5 * twinkle ** 3 + 0.65 * boost)})`;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.6 * dpr, s.size * unit * 1.6) * (1 + 1.4 * boost), 0, Math.PI * 2);
        ctx.fill();
      }

      // Partículas saindo do motor e descendo pelo rastro (mais quando o motor acelera).
      spawn += dt * 34 * (1 + 2.2 * pointer.engine);
      while (spawn >= 1) {
        spawn -= 1;
        particles.push({ born: t, life: 1.8 + Math.random() * 1.6, offset: (Math.random() - 0.5) * 26, wobble: Math.random() * Math.PI * 2, size: 1.2 + Math.random() * 2.4 });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const age = (t - p.born) / p.life;
        if (age >= 1) {
          particles.splice(i, 1);
          continue;
        }
        // Sai rápido do motor e desacelera ao longo do rastro.
        const along = 0.62 * (1 - (1 - age) ** 2);
        const at = trailAt(along);
        const side = p.offset * (0.4 + age) + Math.sin(t * 2.2 + p.wobble) * 6 * age;
        const pos = toCanvas(at.x + at.nx * side, at.y + at.ny * side);
        // O cursor abre o rastro: as partículas se afastam dele.
        if (pointer.presence > 0.01) {
          const dx = pos.x - pointer.sx;
          const dy = pos.y - pointer.sy;
          const dist = Math.hypot(dx, dy) || 1;
          const reach = REACH.trail * dpr;
          if (dist < reach) {
            const push = (1 - dist / reach) ** 2 * 30 * dpr * pointer.presence;
            pos.x += (dx / dist) * push;
            pos.y += (dy / dist) * push;
          }
        }
        const alpha = Math.min(1, age * 8) * (1 - age) ** 1.6;
        const radius = p.size * unit * (1 + age * 1.8);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, pos.x - radius * 3, pos.y - radius * 3, radius * 6, radius * 6);
      }
      ctx.globalAlpha = 1;

      // Motor aceso: respira devagar e cintila rápido, sem ritmo repetitivo.
      const flicker =
        (0.78 + 0.1 * Math.sin(t * 1.3) + 0.06 * Math.sin(t * 9.7) + 0.04 * Math.sin(t * 17.3 + 1.1) + 0.04 * Math.sin(t * 23.9 + 2.3)) *
        (1 + 0.55 * pointer.engine);
      const r = 95 * unit * (0.92 + 0.12 * flicker) * (1 + 0.3 * pointer.engine);
      const core = ctx.createRadialGradient(engine.x, engine.y, 0, engine.x, engine.y, r);
      core.addColorStop(0, `rgba(225, 242, 255, ${0.55 * flicker})`);
      core.addColorStop(0.18, `rgba(120, 195, 255, ${0.38 * flicker})`);
      core.addColorStop(0.5, `rgba(50, 130, 255, ${0.14 * flicker})`);
      core.addColorStop(1, "rgba(30, 90, 255, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(engine.x, engine.y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Só anima com a abertura na tela e a aba visível.
    let onScreen = true;
    const sync = () => (onScreen && document.visibilityState === "visible" ? start() : stop());
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      stop();
      io.disconnect();
      observer.disconnect();
      portraitQuery.removeEventListener("change", resize);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [active]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 size-full transition-opacity duration-[1600ms] ease-out",
          active ? "opacity-100" : "opacity-0",
          className,
        )}
      />
      {/* O slogan na cena. Decorativo: também está no rodapé e nos metadados. */}
      <div
        ref={sloganRef}
        aria-hidden="true"
        className="pointer-events-none absolute hidden min-[1200px]:block [@media(max-height:560px)]:hidden [@media(orientation:portrait)]:hidden"
      >
        <p
          data-active={active || undefined}
          className="rocket-slogan font-serif text-[clamp(1.75rem,2.4vw,2.75rem)] leading-[1.02] tracking-[-0.01em] whitespace-nowrap text-white/85 italic"
        >
          <span>Beyond</span> <span>the</span>
          <br />
          <span>Vision.</span>
        </p>
      </div>
    </>
  );
}
