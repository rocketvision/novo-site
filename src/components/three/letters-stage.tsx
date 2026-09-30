"use client";

import { useEffect, useRef, useState } from "react";
import { GLYPHS } from "./glyphs";
import { cn } from "@/lib/utils";

/** Estado de cada letra, animado pelo scroll (ver Promises) e lido a cada quadro pelo palco. */
export type LetterState = {
  x: number;
  y: number;
  /** Escala. */
  s: number;
  /** Brilho do metal: 0 apagada, 1 prata acesa. */
  b: number;
  /** Órbita e rótulo: 0 escondidos, 1 visíveis. */
  o: number;
  /** Giro extra no eixo vertical, em radianos. */
  r: number;
};

export type StageState = {
  letters: Record<"R" | "V", LetterState>;
  ring: number;
  spin: number;
  /** Logo da Rocket no fim: `arcs` desenha o anel (0 a 1) e `rocket` traz o foguete voando (0 a 1). */
  logo: { arcs: number; rocket: number };
};

const BLUE = 0x2c9df5;

/**
 * Palco 3D das letras da marca (three.js, carregado só no navegador e só quando a seção chega perto).
 * R e V extrudados da própria fonte do site, em metal cromado com reflexos de estúdio e um toque do
 * azul da Rocket. Cada letra tem um anel de órbita inclinado e um rótulo que acompanha a posição dela
 * na tela. Tudo lê `state`, que o scroll anima; o palco só desenha enquanto está visível.
 * No fim, as letras se recolhem e a logo da Rocket se monta no lugar delas: os dois arcos do anel se
 * desenham e o foguete entra voando na diagonal, com a chama azul acesa.
 * Sem WebGL, cai para as letras em CSS.
 */
export function LettersStage({ state, labels, className }: { state: React.RefObject<StageState>; labels: Record<"R" | "V", string>; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const THREE = await import("three");
      const { SVGLoader } = await import("three/examples/jsm/loaders/SVGLoader.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        setFallback(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = "absolute inset-0 size-full";
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;

      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
      camera.position.set(0, 0, 7.2);

      // Luz azul rasante: o reflexo da cor da Rocket passando pelo metal.
      const blue = new THREE.PointLight(BLUE, 18, 12, 1.6);
      blue.position.set(-2.5, -1.5, 2.5);
      scene.add(blue);
      const rim = new THREE.DirectionalLight(0xffffff, 1.4);
      rim.position.set(3, 4, 5);
      scene.add(rim);

      const loader = new SVGLoader();
      const bright = new THREE.Color("#eef1f5");
      const dim = new THREE.Color("#3a3f47");

      type Built = { group: import("three").Group; letter: import("three").Mesh; material: import("three").MeshPhysicalMaterial; orbit: import("three").Line; orbitMaterial: import("three").LineBasicMaterial; dot: import("three").Mesh };
      const built = {} as Record<"R" | "V", Built>;

      (["R", "V"] as const).forEach((key, i) => {
        const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${GLYPHS[key]}"/></svg>`);
        const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
        const geometry = new THREE.ExtrudeGeometry(shapes, {
          depth: 0.2,
          bevelEnabled: true,
          bevelThickness: 0.035,
          bevelSize: 0.022,
          bevelSegments: 6,
          curveSegments: 18,
        });
        geometry.center();
        geometry.computeVertexNormals();
        const material = new THREE.MeshPhysicalMaterial({ color: bright.clone(), metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.35 });
        const letter = new THREE.Mesh(geometry, material);

        // Órbita: uma elipse fina e inclinada em volta da letra, com um ponto que corre por ela.
        const curve = new THREE.EllipseCurve(0, 0, 0.78, 0.26, 0, Math.PI * 2, false, 0);
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0)));
        const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xd6dbe3, transparent: true, opacity: 0 });
        const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
        orbit.rotation.set(-1.18, 0.12 * (i ? -1 : 1), -0.16);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 16), new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0 }));
        orbit.add(dot);

        const group = new THREE.Group();
        group.add(letter, orbit);
        scene.add(group);
        built[key] = { group, letter, material, orbit, orbitMaterial, dot };
      });

      // Logo da Rocket (o mesmo desenho de LogoMark, 32 × 32, centro em 16,16), em 3D.
      const LOGO_SCALE = 1 / 13;
      const logo = new THREE.Group();
      logo.visible = false;
      scene.add(logo);
      const logoMaterial = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#c9cfd8"), metalness: 1, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.15 });
      // Anel: dois arcos de 130°, simétricos, como tubos finos. O desenho cresce pelo drawRange.
      const arcs = [20, 200].map((startDeg) => {
        const points = Array.from({ length: 65 }, (_, k) => {
          const a = THREE.MathUtils.degToRad(startDeg - (130 * k) / 64);
          return new THREE.Vector3(Math.cos(a) * 14 * LOGO_SCALE, Math.sin(a) * 14 * LOGO_SCALE, 0);
        });
        const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 128, 0.8 * LOGO_SCALE, 12, false);
        const mesh = new THREE.Mesh(geometry, logoMaterial);
        logo.add(mesh);
        return { mesh, total: geometry.index ? geometry.index.count : 0 };
      });
      // Foguete: corpo com a janela vazada e as aletas, extrudados; a 45°, como na marca.
      const rocket = new THREE.Group();
      const rocketSvg = loader.parse(
        '<svg xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Zm1.6 6.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 1 0 3.2 0Z"/><path d="M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z"/></svg>',
      );
      const rocketShapes = rocketSvg.paths.flatMap((path) => SVGLoader.createShapes(path));
      const rocketGeometry = new THREE.ExtrudeGeometry(rocketShapes, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.22, bevelSegments: 5, curveSegments: 20 });
      rocketGeometry.translate(-16, -16, -0.8);
      rocketGeometry.scale(LOGO_SCALE, -LOGO_SCALE, LOGO_SCALE);
      rocket.add(new THREE.Mesh(rocketGeometry, logoMaterial));
      // Chama: um cone de luz azul colado na cauda, com a ponta para trás; o brilho soma com o fundo.
      const flameMaterial = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const flameGeometry = new THREE.ConeGeometry(1.15 * LOGO_SCALE, 5.5 * LOGO_SCALE, 24, 1, true);
      flameGeometry.rotateX(Math.PI);
      flameGeometry.translate(0, -2.75 * LOGO_SCALE, 0);
      const flame = new THREE.Mesh(flameGeometry, flameMaterial);
      flame.position.set(0, -(20.3 - 16) * LOGO_SCALE, 0);
      rocket.add(flame);
      const flameLight = new THREE.PointLight(BLUE, 0, 3, 2);
      flameLight.position.copy(flame.position);
      rocket.add(flameLight);
      // A marca desenha o foguete a 45° para a direita.
      rocket.rotation.z = -Math.PI / 4;
      logo.add(rocket);

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = el;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(h, 1);
        // Em telas estreitas, a câmera recua para as letras caberem.
        camera.position.z = camera.aspect < 0.9 ? 7.2 / Math.max(camera.aspect, 0.55) : 7.2;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      resize();

      const v = new THREE.Vector3();
      let raf = 0;
      let visible = false;
      const clock = new THREE.Clock();
      const frame = () => {
        raf = 0;
        if (!visible) return;
        const t = clock.getElapsedTime();
        const st = state.current;
        (["R", "V"] as const).forEach((key, i) => {
          const s = st.letters[key];
          const b = built[key];
          b.group.position.set(s.x, s.y, 0);
          b.group.scale.setScalar(Math.max(s.s, 0.0001));
          b.group.visible = s.s > 0.01;
          // Flutuação viva, independente do scroll, mais o giro que o scroll comanda.
          b.letter.rotation.set(0.18 * Math.sin(t * 0.6 + i * 2) - 0.08, s.r + 0.35 * Math.sin(t * 0.45 + i * 1.7), 0.05 * Math.sin(t * 0.5 + i));
          b.material.color.copy(dim).lerp(bright, s.b);
          b.material.envMapIntensity = 0.45 + 1.1 * s.b;
          b.orbitMaterial.opacity = 0.55 * s.o;
          (b.dot.material as import("three").MeshBasicMaterial).opacity = s.o;
          const a = t * 0.9 + i * 3;
          b.dot.position.set(0.78 * Math.cos(a), 0.26 * Math.sin(a), 0);
          // Rótulo: preso ao ponto mais à direita da órbita, projetado na tela.
          const label = labelRefs.current[key];
          if (label) {
            v.set(0.8, 0, 0);
            b.orbit.localToWorld(v);
            v.project(camera);
            const x = (v.x * 0.5 + 0.5) * el.clientWidth;
            const y = (-v.y * 0.5 + 0.5) * el.clientHeight;
            label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            label.style.opacity = String(s.o);
          }
        });
        // Logo: o anel se desenha e o foguete chega voando pela diagonal, de baixo para cima.
        const { arcs: arcProgress, rocket: rocketProgress } = st.logo;
        logo.visible = arcProgress > 0.001 || rocketProgress > 0.001;
        if (logo.visible) {
          arcs.forEach((arc) => arc.mesh.geometry.setDrawRange(0, Math.floor((arc.total * arcProgress) / 3) * 3));
          const ease = 1 - Math.pow(1 - rocketProgress, 3);
          const travel = (1 - ease) * 3.2;
          rocket.position.set(-travel * Math.SQRT1_2, -travel * Math.SQRT1_2, 0);
          rocket.scale.setScalar(0.6 + 0.4 * ease);
          rocket.visible = rocketProgress > 0.001;
          const flicker = 0.85 + 0.15 * Math.sin(t * 22) * Math.sin(t * 13);
          flame.scale.set(1, (0.6 + 0.8 * (1 - ease) + 0.25 * flicker) * Math.min(1, rocketProgress * 3), 1);
          flameMaterial.opacity = 0.55 + 0.35 * flicker;
          flameLight.intensity = 6 * rocketProgress * flicker;
          // Parada, a logo respira: um balanço lento para mostrar o volume do metal.
          logo.rotation.set(0.12 * Math.sin(t * 0.5), 0.35 * Math.sin(t * 0.4), 0);
          logo.scale.setScalar(1.25);
        }
        blue.position.x = -2.5 + 1.2 * Math.sin(st.spin * Math.PI * 2);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
      });
      io.observe(el);

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        observer.disconnect();
        Object.values(built).forEach((b) => {
          b.letter.geometry.dispose();
          b.material.dispose();
          b.orbit.geometry.dispose();
          b.orbitMaterial.dispose();
        });
        arcs.forEach((arc) => arc.mesh.geometry.dispose());
        rocketGeometry.dispose();
        flame.geometry.dispose();
        flameMaterial.dispose();
        logoMaterial.dispose();
        envTexture.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    // Só carrega o three.js quando a seção está chegando.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        start().catch(() => setFallback(true));
      },
      { rootMargin: "100% 0px" },
    );
    near.observe(el);
    return () => {
      disposed = true;
      near.disconnect();
      cleanup();
    };
  }, [state]);

  return (
    <div ref={host} className={cn("relative", className)} aria-hidden="true">
      {fallback && (
        <div className="absolute inset-0 flex items-center justify-center gap-[6%] text-[clamp(7rem,16vw,15rem)] leading-none font-medium">
          {(["R", "V"] as const).map((key) => (
            <span key={key} className="bg-[linear-gradient(172deg,#ffffff_0%,#b9c0c9_28%,#f3f5f8_46%,#6b737e_64%,#dfe4ea_82%,#8d949e_100%)] bg-clip-text text-transparent">
              {key}
            </span>
          ))}
        </div>
      )}
      {(["R", "V"] as const).map((key) => (
        <div
          key={key}
          ref={(node) => {
            labelRefs.current[key] = node;
          }}
          className="pointer-events-none absolute top-0 left-0 flex items-center gap-2 opacity-0 will-change-transform"
        >
          <span className="h-px w-10 bg-white/30" />
          <span className="font-mono text-[0.6875rem] tracking-[0.04em] whitespace-nowrap text-white/60">
            {key} · {labels[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
