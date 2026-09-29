/**
 * Capas autorais dos artigos iniciais, desenhadas em código (SVG) e convertidas em WebP pelo seed.
 * Cada capa é um diagrama abstrato do tema do artigo, na paleta da Rocket Vision:
 * grafite, papel e o laranja de acento. Sem banco de imagens, sem fotos geradas e sem ícones 3D.
 */

export const W = 1600;
export const H = 900;

const INK = "#0a0a0b";
const GRAPHITE = "#1d1d1f";
const PAPER = "#fbfbfd";
const MIST = "#e9e9ee";
const ACCENT = "#ff5b1f";
const ACCENT_SOFT = "#ff8a5c";

type Theme = { bg: string; fg: string; faint: string };
const DARK: Theme = { bg: INK, fg: "#f4f4f5", faint: "rgba(255,255,255,0.14)" };
const LIGHT: Theme = { bg: PAPER, fg: GRAPHITE, faint: "rgba(0,0,0,0.10)" };

function frame(t: Theme, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <g stroke="${t.faint}" stroke-width="1">${Array.from({ length: 15 }, (_, i) => `<line x1="${(i + 1) * 100}" y1="0" x2="${(i + 1) * 100}" y2="${H}"/>`).join("")}${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${(i + 1) * 100}" x2="${W}" y2="${(i + 1) * 100}"/>`).join("")}</g>
  ${body}
</svg>`;
}

/** Gerador pseudoaleatório com semente: a mesma capa sai sempre igual. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const covers: Record<string, () => string> = {
  /** Agente: um núcleo que planeja e chama ferramentas, com um ponto de aprovação humana. */
  agentes: () => {
    const t = DARK;
    const tools = [
      [1180, 220],
      [1300, 450],
      [1180, 680],
      [420, 250],
      [330, 560],
    ];
    const links = tools.map(([x, y]) => `<path d="M800 450 C ${(800 + x) / 2} 450, ${(800 + x) / 2} ${y}, ${x} ${y}" fill="none" stroke="${t.fg}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="6 10"/>`).join("");
    const nodes = tools.map(([x, y]) => `<rect x="${x - 46}" y="${y - 46}" width="92" height="92" rx="20" fill="${GRAPHITE}" stroke="${t.fg}" stroke-opacity="0.6" stroke-width="2"/>`).join("");
    return frame(t, `${links}${nodes}
      <circle cx="800" cy="450" r="150" fill="none" stroke="${ACCENT}" stroke-width="3"/>
      <circle cx="800" cy="450" r="96" fill="${ACCENT}"/>
      <circle cx="800" cy="450" r="210" fill="none" stroke="${t.fg}" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="2 12"/>
      <rect x="1256" y="406" width="88" height="88" rx="44" fill="none" stroke="${ACCENT_SOFT}" stroke-width="4"/>`);
  },
  /** Prompt injection: linhas de instrução legítimas e uma linha estranha infiltrada no meio. */
  "prompt-injection": () => {
    const t = LIGHT;
    const r = rng(7);
    const rows = Array.from({ length: 11 }, (_, i) => {
      const y = 150 + i * 56;
      const w = 500 + r() * 520;
      const bad = i === 6;
      return `<rect x="${bad ? 360 : 300}" y="${y}" width="${w}" height="22" rx="11" fill="${bad ? ACCENT : GRAPHITE}" fill-opacity="${bad ? 1 : 0.14 + r() * 0.2}"/>`;
    }).join("");
    return frame(t, `<rect x="240" y="100" width="1120" height="700" rx="36" fill="#ffffff" stroke="${MIST}" stroke-width="2"/>${rows}
      <path d="M1180 486 L1330 486" stroke="${ACCENT}" stroke-width="4"/><circle cx="1350" cy="486" r="14" fill="${ACCENT}"/>`);
  },
  /** IA e LGPD: um conjunto de registros com parte dos dados protegida antes de chegar ao modelo. */
  "ia-lgpd": () => {
    const t = DARK;
    const r = rng(21);
    let dots = "";
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 9; y++) {
        const masked = r() < 0.32;
        dots += masked
          ? `<rect x="${230 + x * 44 - 12}" y="${180 + y * 64 - 12}" width="24" height="24" rx="4" fill="none" stroke="${ACCENT}" stroke-width="2"/>`
          : `<circle cx="${230 + x * 44}" cy="${180 + y * 64}" r="9" fill="${t.fg}" fill-opacity="0.55"/>`;
      }
    return frame(t, `${dots}
      <path d="M1180 250 L1330 300 L1330 470 C1330 580 1260 650 1180 690 C1100 650 1030 580 1030 470 L1030 300 Z" fill="none" stroke="${ACCENT}" stroke-width="4"/>
      <path d="M1120 470 L1165 515 L1250 420" fill="none" stroke="${t.fg}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`);
  },
  /** Zero Trust: o perímetro antigo apagado; cada recurso com a própria verificação. */
  "zero-trust": () => {
    const t = LIGHT;
    const r = rng(3);
    const pts = Array.from({ length: 14 }, () => [320 + r() * 960, 170 + r() * 560]);
    const nodes = pts
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="30" fill="#ffffff" stroke="${GRAPHITE}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="42" fill="none" stroke="${i % 3 === 0 ? ACCENT : GRAPHITE}" stroke-opacity="${i % 3 === 0 ? 1 : 0.25}" stroke-width="2"/>`)
      .join("");
    return frame(t, `<rect x="200" y="110" width="1200" height="680" rx="60" fill="none" stroke="${GRAPHITE}" stroke-opacity="0.18" stroke-width="3" stroke-dasharray="14 14"/>${nodes}`);
  },
  /** Passkey: par de chaves, a pública no servidor e a privada presa ao aparelho. */
  passkeys: () => {
    const t = DARK;
    return frame(t, `
      <rect x="300" y="200" width="300" height="520" rx="48" fill="${GRAPHITE}" stroke="${t.fg}" stroke-opacity="0.5" stroke-width="3"/>
      <circle cx="450" cy="420" r="70" fill="none" stroke="${ACCENT}" stroke-width="6"/>
      <rect x="440" y="480" width="20" height="120" rx="6" fill="${ACCENT}"/>
      <rect x="1000" y="260" width="320" height="400" rx="28" fill="none" stroke="${t.fg}" stroke-opacity="0.55" stroke-width="3"/>
      ${Array.from({ length: 5 }, (_, i) => `<rect x="1040" y="${300 + i * 70}" width="${240 - (i % 2) * 70}" height="18" rx="9" fill="${t.fg}" fill-opacity="0.35"/>`).join("")}
      <circle cx="1160" cy="610" r="26" fill="none" stroke="${t.fg}" stroke-width="4"/>
      <path d="M620 460 C 760 360, 860 360, 990 460" fill="none" stroke="${t.fg}" stroke-opacity="0.6" stroke-width="3" stroke-dasharray="8 10"/>
      <path d="M990 500 C 860 600, 760 600, 620 500" fill="none" stroke="${ACCENT}" stroke-width="3"/>`);
  },
  /** Ransomware: o ciclo preparar, detectar, conter e recuperar. */
  ransomware: () => {
    const t = LIGHT;
    const cx = 800,
      cy = 450,
      R = 280;
    const arc = (a0: number, a1: number, color: string, w: number) => {
      const p = (a: number) => [cx + R * Math.cos((a * Math.PI) / 180), cy + R * Math.sin((a * Math.PI) / 180)];
      const [x0, y0] = p(a0),
        [x1, y1] = p(a1);
      return `<path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
    };
    return frame(t, `${arc(-80, -10, ACCENT, 30)}${arc(10, 80, GRAPHITE, 30)}${arc(100, 170, GRAPHITE, 30)}${arc(190, 260, GRAPHITE, 30)}
      <circle cx="${cx}" cy="${cy}" r="150" fill="${GRAPHITE}"/>
      <rect x="740" y="410" width="120" height="100" rx="14" fill="none" stroke="${PAPER}" stroke-width="6"/>
      <path d="M765 410 V380 a35 35 0 0 1 70 0 V410" fill="none" stroke="${PAPER}" stroke-width="6"/>`);
  },
  /** OWASP Top 10: dez riscos como barras, o primeiro em destaque. */
  owasp: () => {
    const t = DARK;
    const lens = [980, 880, 820, 760, 700, 640, 560, 500, 430, 380];
    const bars = lens.map((w, i) => `<rect x="310" y="${150 + i * 62}" width="${w}" height="34" rx="6" fill="${i === 0 ? ACCENT : t.fg}" fill-opacity="${i === 0 ? 1 : 0.18 + (9 - i) * 0.03}"/><circle cx="270" cy="${167 + i * 62}" r="8" fill="${t.fg}" fill-opacity="0.5"/>`).join("");
    return frame(t, bars);
  },
  /** Core Web Vitals: três medidores. */
  "web-vitals": () => {
    const t = LIGHT;
    const gauge = (cx: number, v: number) => {
      const R = 170;
      const end = Math.PI * (1 - v);
      const x = cx + R * Math.cos(end),
        y = 520 - R * Math.sin(end);
      return `<path d="M${cx - R} 520 A${R} ${R} 0 0 1 ${cx + R} 520" fill="none" stroke="${MIST}" stroke-width="34" stroke-linecap="round"/>
        <path d="M${cx - R} 520 A${R} ${R} 0 0 1 ${x} ${y}" fill="none" stroke="${v > 0.7 ? ACCENT : GRAPHITE}" stroke-width="34" stroke-linecap="round"/>
        <circle cx="${cx}" cy="520" r="14" fill="${GRAPHITE}"/><line x1="${cx}" y1="520" x2="${cx + (R - 50) * Math.cos(end)}" y2="${520 - (R - 50) * Math.sin(end)}" stroke="${GRAPHITE}" stroke-width="6" stroke-linecap="round"/>`;
    };
    return frame(t, `${gauge(380, 0.82)}${gauge(800, 0.62)}${gauge(1220, 0.74)}`);
  },
  /** Acessibilidade: foco visível e alvos de toque com tamanho adequado. */
  acessibilidade: () => {
    const t = DARK;
    return frame(t, `
      <rect x="260" y="260" width="520" height="120" rx="60" fill="${GRAPHITE}" stroke="${t.fg}" stroke-opacity="0.4" stroke-width="2"/>
      <rect x="244" y="244" width="552" height="152" rx="76" fill="none" stroke="${ACCENT}" stroke-width="6"/>
      <rect x="260" y="470" width="520" height="120" rx="60" fill="${GRAPHITE}" stroke="${t.fg}" stroke-opacity="0.4" stroke-width="2"/>
      ${[0, 1, 2].map((i) => `<circle cx="${1000 + i * 150}" cy="330" r="48" fill="none" stroke="${t.fg}" stroke-opacity="0.7" stroke-width="3"/>`).join("")}
      ${[0, 1, 2].map((i) => `<circle cx="${1000 + i * 150}" cy="530" r="48" fill="${i === 1 ? ACCENT : "none"}" stroke="${t.fg}" stroke-opacity="0.7" stroke-width="3"/>`).join("")}`);
  },
  /** Cadeia de suprimentos: árvore de dependências com um pacote comprometido. */
  "supply-chain": () => {
    const t = LIGHT;
    const levels = [[800], [500, 800, 1100], [350, 550, 700, 900, 1050, 1250], [300, 420, 540, 660, 780, 900, 1020, 1140, 1260]];
    let lines = "",
      nodes = "";
    levels.forEach((row, l) =>
      row.forEach((x, i) => {
        const y = 170 + l * 190;
        if (l > 0) {
          const parent = levels[l - 1][Math.min(levels[l - 1].length - 1, Math.floor((i * levels[l - 1].length) / row.length))];
          lines += `<line x1="${parent}" y1="${y - 190}" x2="${x}" y2="${y}" stroke="${GRAPHITE}" stroke-opacity="0.3" stroke-width="2"/>`;
        }
        const bad = l === 3 && i === 5;
        nodes += `<rect x="${x - 34}" y="${y - 34}" width="68" height="68" rx="14" fill="${bad ? ACCENT : l === 0 ? GRAPHITE : "#ffffff"}" stroke="${GRAPHITE}" stroke-width="2"/>`;
      }),
    );
    return frame(t, lines + nodes);
  },
  /** Pós-quântica: um reticulado de pontos, a base matemática dos novos padrões. */
  "pos-quantica": () => {
    const t = DARK;
    let pts = "";
    for (let i = -8; i <= 8; i++)
      for (let j = -5; j <= 5; j++) {
        const x = 800 + i * 90 + j * 40,
          y = 450 + j * 80;
        if (x < 120 || x > 1480) continue;
        pts += `<circle cx="${x}" cy="${y}" r="6" fill="${t.fg}" fill-opacity="0.5"/>`;
      }
    return frame(t, `${pts}
      <line x1="800" y1="450" x2="1070" y2="530" stroke="${ACCENT}" stroke-width="6" stroke-linecap="round"/>
      <line x1="800" y1="450" x2="930" y2="290" stroke="${t.fg}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="800" cy="450" r="14" fill="${ACCENT}"/>
      <circle cx="1030" cy="530" r="40" fill="none" stroke="${ACCENT}" stroke-width="3" stroke-dasharray="6 8"/>`);
  },
  /** Regulação de IA: camadas de risco, da mínima à inaceitável. */
  "regulacao-ia": () => {
    const t = LIGHT;
    const tiers = [
      [560, 180, 480, ACCENT],
      [480, 330, 640, GRAPHITE],
      [400, 480, 800, "#52525b"],
      [320, 630, 960, "#a1a1aa"],
    ] as const;
    return frame(t, tiers.map(([x, y, w, c]) => `<rect x="${x}" y="${y}" width="${w}" height="120" rx="16" fill="${c}"/>`).join(""));
  },
  /** Processo da Rocket: etapas em linha, de ideia a operação. */
  "processo-rocket": () => {
    const t = DARK;
    const xs = [260, 530, 800, 1070, 1340];
    return frame(t, `<line x1="260" y1="450" x2="1340" y2="450" stroke="${t.fg}" stroke-opacity="0.4" stroke-width="3"/>
      ${xs.map((x, i) => `<circle cx="${x}" cy="450" r="${i === 4 ? 70 : 44}" fill="${i === 4 ? ACCENT : GRAPHITE}" stroke="${t.fg}" stroke-opacity="0.6" stroke-width="3"/>`).join("")}
      <path d="M800 450 m-380 0 a380 220 0 1 0 760 0 a380 220 0 1 0 -760 0" fill="none" stroke="${ACCENT_SOFT}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="4 12"/>`);
  },
};

export function coverSvg(name: string) {
  const make = covers[name];
  if (!make) throw new Error(`Capa desconhecida: ${name}`);
  return make();
}

export const COVER_NAMES = Object.keys(covers);
