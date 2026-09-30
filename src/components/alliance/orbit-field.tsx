"use client";

import { useEffect, useRef } from "react";

/**
 * O ecossistema do Rocket Alliance: pontos em três órbitas inclinadas em volta de um centro (a Rocket
 * Vision), ligados por linhas finas quando se aproximam, como parcerias que se formam. Canvas 2D leve:
 * para quando sai da tela ou a aba fica oculta; com "reduzir movimento", desenha um quadro parado.
 */
type Node = { orbit: number; angle: number; speed: number; size: number; bright: boolean };

const ORBITS = [
  { rx: 0.2, ry: 0.075, tilt: -0.32 },
  { rx: 0.34, ry: 0.13, tilt: -0.18 },
  { rx: 0.48, ry: 0.19, tilt: -0.26 },
];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function OrbitField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = seeded(7);
    const nodes: Node[] = [];
    ORBITS.forEach((_, orbit) => {
      const count = [7, 11, 15][orbit];
      for (let i = 0; i < count; i++) {
        nodes.push({ orbit, angle: (i / count) * Math.PI * 2 + rand() * 0.5, speed: (0.035 + rand() * 0.02) * (orbit % 2 ? -1 : 1) * (1 - orbit * 0.2), size: 1 + rand() * 1.6, bright: rand() > 0.72 });
      }
    });

    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const point = (n: Node) => {
      const o = ORBITS[n.orbit];
      const scale = Math.min(width, height * 1.9);
      const x = Math.cos(n.angle) * o.rx * scale;
      const y = Math.sin(n.angle) * o.ry * scale;
      const cos = Math.cos(o.tilt);
      const sin = Math.sin(o.tilt);
      // Profundidade: pontos "atrás" do centro ficam menores e mais apagados.
      const depth = (Math.sin(n.angle) + 1) / 2;
      return { x: width / 2 + x * cos - y * sin, y: height / 2 + x * sin + y * cos, depth };
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min(width, height * 1.9);
      // Órbitas.
      ctx.lineWidth = 1;
      for (const o of ORBITS) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(o.tilt);
        ctx.beginPath();
        ctx.ellipse(0, 0, o.rx * scale, o.ry * scale, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.09)";
        ctx.stroke();
        ctx.restore();
      }
      // Núcleo: a Rocket Vision no centro do ecossistema.
      const core = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, scale * 0.09);
      core.addColorStop(0, "rgba(160,210,255,0.55)");
      core.addColorStop(0.25, "rgba(44,157,245,0.22)");
      core.addColorStop(1, "rgba(44,157,245,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, scale * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(235,245,255,0.95)";
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      for (const n of nodes) n.angle += n.speed * dt;
      const pts = nodes.map((n) => ({ n, ...point(n) }));
      // Ligações entre pontos próximos: as parcerias.
      const reach = scale * 0.13;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < reach) {
            const alpha = (1 - d / reach) * 0.35 * Math.min(a.depth, b.depth) + 0.02;
            ctx.strokeStyle = `rgba(44,157,245,${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      // Linhas ao centro dos pontos mais brilhantes.
      for (const p of pts) {
        if (!p.n.bright) continue;
        const g = ctx.createLinearGradient(width / 2, height / 2, p.x, p.y);
        g.addColorStop(0, "rgba(44,157,245,0)");
        g.addColorStop(1, `rgba(44,157,245,${(0.1 + p.depth * 0.18).toFixed(3)})`);
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(width / 2, height / 2);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      // Pontos.
      for (const p of pts) {
        const r = p.n.size * (0.6 + p.depth * 0.7);
        ctx.fillStyle = p.n.bright ? `rgba(160,210,255,${(0.45 + p.depth * 0.55).toFixed(3)})` : `rgba(255,255,255,${(0.2 + p.depth * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (p.n.bright && p.depth > 0.5) {
          ctx.fillStyle = "rgba(44,157,245,0.12)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(dt);
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (reduce || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    resize();
    draw(0);
    const ro = new ResizeObserver(() => {
      resize();
      draw(0);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);
    const onVisibility = () => !document.hidden && visible && start();
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
