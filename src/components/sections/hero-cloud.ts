/**
 * A nuvem de improvisos do hero.
 *
 * Os objetos com que um negócio em crescimento se vira antes de ter um sistema:
 * planilhas duplicadas, mensagens soltas, buscas perdidas, post-its e comandas.
 * Posições geradas de forma determinística (a mesma nuvem no servidor e no navegador).
 */

export type CloudKind = "file" | "chat" | "search" | "note" | "receipt";

export type CloudItem = {
  kind: CloudKind;
  /** Texto principal do objeto. */
  text: string;
  /** Complemento (hora da mensagem, página da busca...). */
  meta?: string;
  /** Posição no espaço da cena, em px. z negativo = mais longe. */
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  /** Tamanho relativo (1 = normal). */
  scale: number;
  /** Duração da flutuação, em segundos. */
  drift: number;
  /** Índice do improviso da copy que este objeto representa (os 4 em destaque). */
  featured?: number;
};

/** Improvisos de apoio: o volume do caos em volta dos quatro da copy. */
const EXTRAS: Pick<CloudItem, "kind" | "text" | "meta">[] = [
  { kind: "file", text: "estoque_atualizado_OK.xlsx", meta: "Editado por 3 pessoas" },
  { kind: "chat", text: "Ainda tem o tamanho M?", meta: "09:02" },
  { kind: "note", text: "Ligar pro fornecedor!!" },
  { kind: "receipt", text: "Mesa 4", meta: "2x café · 1x pão de queijo" },
  { kind: "file", text: "pedidos_marco (1).xlsx", meta: "Última edição: 00:17" },
  { kind: "chat", text: "Consegue entregar hoje?", meta: "11:48" },
  { kind: "search", text: "loja perto de mim", meta: "Página 4 dos resultados" },
  { kind: "note", text: "Conferir o caixa de ontem" },
  { kind: "chat", text: "Me manda o orçamento de novo?", meta: "18:31" },
  { kind: "file", text: "clientes_NOVOS_final.xlsx", meta: "Arquivo corrompido?" },
  { kind: "receipt", text: "Pedido 118", meta: "Retirada 17h · pago?" },
  { kind: "note", text: "Atualizar o site??" },
  { kind: "chat", text: "Vocês abrem domingo?", meta: "22:40" },
  { kind: "file", text: "agenda_semana_v3.xlsx", meta: "Conflito de versões" },
  { kind: "search", text: "orçamento site preço", meta: "Página 2 dos resultados" },
  { kind: "note", text: "Responder os e-mails" },
  { kind: "chat", text: "Esqueceram meu pedido 😕", meta: "13:15" },
  { kind: "receipt", text: "Encomenda 42", meta: "Anotado no caderno" },
  { kind: "file", text: "financeiro_2024_NAO_MEXER.xlsx", meta: "Somente leitura" },
  { kind: "chat", text: "Qual o pix?", meta: "08:47" },
  { kind: "note", text: "Fazer planilha nova" },
  { kind: "file", text: "comissoes_marco.xlsx", meta: "Fórmula com erro" },
  { kind: "chat", text: "Chegou o boleto?", meta: "16:20" },
  { kind: "receipt", text: "Mesa 9", meta: "Conta dividida em 3" },
  { kind: "note", text: "Ver sistema depois" },
  { kind: "chat", text: "Tem horário amanhã?", meta: "21:05" },
  { kind: "file", text: "controle_FINAL_v6.xlsx", meta: "Duplicado" },
  { kind: "search", text: "sua empresa endereço", meta: "Sem resultados" },
  { kind: "note", text: "Não esquecer: nota fiscal" },
  { kind: "chat", text: "Oi? Alguém aí?", meta: "19:58" },
  { kind: "receipt", text: "Delivery 7", meta: "Endereço errado" },
  { kind: "file", text: "precos_2023_atual.xlsx", meta: "Última edição: 23:02" },
];

/** Gerador pseudoaleatório com semente (mulberry32): a nuvem é sempre a mesma. */
function random(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: () => number, min: number, max: number) => min + r() * (max - min);

/** Distância que a câmera percorre dentro da nuvem, em px. */
export const CAMERA_TRAVEL = 3000;

/** Profundidade de cada improviso em destaque: um a um, a câmera passa por eles. */
export const FEATURED_DEPTHS = [-1100, -1800, -2500, -3200];

/**
 * Monta a nuvem. `spread` controla a largura do túnel (menor no celular);
 * os objetos de apoio evitam o eixo da câmera para passar pelos lados, não através dela.
 */
export function buildCloud(
  featured: { kind: "file" | "chat" | "search" | "note"; text: string; meta: string }[],
  { count, spread }: { count: number; spread: number },
): CloudItem[] {
  const r = random(7);
  const items: CloudItem[] = [];

  featured.forEach((item, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    items.push({
      kind: item.kind,
      text: item.text,
      meta: item.meta,
      x: side * spread * 0.2,
      y: (i % 2 === 0 ? -1 : 1) * 60,
      z: FEATURED_DEPTHS[i] ?? -1100 - i * 700,
      rx: side * 6,
      ry: -side * 14,
      rz: side * 5,
      scale: 1.25,
      drift: 7 + i,
      featured: i,
    });
  });

  for (let i = 0; i < count; i++) {
    const extra = EXTRAS[i % EXTRAS.length];
    // Anel em volta do eixo da câmera: longe o bastante do centro para não atravessá-la.
    const angle = between(r, 0, Math.PI * 2);
    const radius = between(r, spread * 0.32, spread);
    items.push({
      ...extra,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.55,
      z: between(r, -4400, -250),
      rx: between(r, -28, 28),
      ry: between(r, -40, 40),
      rz: between(r, -18, 18),
      scale: between(r, 0.8, 1.1),
      drift: between(r, 6, 11),
    });
  }
  return items;
}

/**
 * Posição final de cada objeto na grade, em px, num plano à frente da câmera
 * depois do mergulho. O caos vira ordem.
 */
export function gridSlot(index: number, total: number, cols: number, cell: { w: number; h: number }) {
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: (col - (cols - 1) / 2) * cell.w,
    y: (row - (rows - 1) / 2) * cell.h,
  };
}
