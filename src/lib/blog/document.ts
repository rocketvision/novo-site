/**
 * Documento de um artigo do Blog.
 *
 * O editor (Tiptap) produz um JSON no formato ProseMirror. O servidor nunca aceita HTML: só este JSON,
 * validado por `parseDocument`, que percorre a árvore com uma lista fechada de nós, marcas e atributos.
 * Qualquer coisa fora dela (nó desconhecido, atributo extra, link javascript:, embed de outro domínio)
 * faz a validação falhar. O que passa é reconstruído do zero, então nenhum campo inesperado chega ao banco.
 *
 * A renderização pública (src/components/blog/article-body.tsx) percorre o mesmo JSON e gera React,
 * sem dangerouslySetInnerHTML.
 */

export type Mark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "strike" }
  | { type: "code" }
  | { type: "link"; attrs: { href: string } };

export type TextNode = { type: "text"; text: string; marks?: Mark[] };
export type HardBreak = { type: "hardBreak" };
export type Inline = TextNode | HardBreak;

export type Paragraph = { type: "paragraph"; content?: Inline[] };
export type Heading = { type: "heading"; attrs: { level: 2 | 3 | 4 }; content?: Inline[] };
export type ListItem = { type: "listItem"; content: (Paragraph | BulletList | OrderedList)[] };
export type BulletList = { type: "bulletList"; content: ListItem[] };
export type OrderedList = { type: "orderedList"; attrs: { start: number }; content: ListItem[] };
export type Blockquote = { type: "blockquote"; content: Paragraph[] };
export type CodeBlock = { type: "codeBlock"; attrs: { language: string | null }; content?: { type: "text"; text: string }[] };
export type HorizontalRule = { type: "horizontalRule" };
export type Figure = { type: "figure"; attrs: { mediaId: string; src: string; alt: string; caption: string; width: number; height: number } };
export type Embed = { type: "embed"; attrs: { provider: EmbedProvider; id: string; title: string } };
export type TableCell = { type: "tableCell" | "tableHeader"; attrs: { colspan: number; rowspan: number }; content: Paragraph[] };
export type TableRow = { type: "tableRow"; content: TableCell[] };
export type Table = { type: "table"; content: TableRow[] };

export type Block = Paragraph | Heading | BulletList | OrderedList | Blockquote | CodeBlock | HorizontalRule | Figure | Embed | Table;
export type BlogDocument = { type: "doc"; content: Block[] };

export const EMPTY_DOCUMENT: BlogDocument = { type: "doc", content: [{ type: "paragraph" }] };

/* -------------------------------------------------------------------------- */
/* Limites                                                                      */
/* -------------------------------------------------------------------------- */

export const DOCUMENT_LIMITS = {
  /** Tamanho do JSON serializado. Um artigo longo com tabelas fica bem abaixo disso. */
  bytes: 400_000,
  nodes: 8_000,
  depth: 10,
  text: 20_000,
  code: 20_000,
  tableRows: 60,
  tableCols: 10,
} as const;

export const CODE_LANGUAGES = [
  "bash", "css", "diff", "go", "graphql", "java", "javascript", "json", "kotlin", "markdown", "php",
  "plaintext", "python", "ruby", "rust", "sql", "swift", "typescript", "xml", "yaml",
] as const;

/* -------------------------------------------------------------------------- */
/* Links e embeds                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Link seguro dentro do texto: https, http, mailto, caminho interno (/blog) ou âncora (#secao).
 * Bloqueia javascript:, data:, vbscript:, protocol-relative (//) e qualquer outro esquema.
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!href || href.length > 2000 || /[\s\u0000-\u001f]/.test(href)) return null;
  if (/^\/(?![/\\])/.test(href)) return href;
  if (/^#[\w-]{1,100}$/.test(href)) return href;
  try {
    const url = new URL(href);
    if (url.protocol === "https:" || url.protocol === "http:") return url.hostname ? url.toString() : null;
    if (url.protocol === "mailto:") return href;
  } catch {
    return null;
  }
  return null;
}

export function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export type EmbedProvider = "youtube" | "vimeo" | "loom";

export const EMBED_PROVIDERS: Record<EmbedProvider, { label: string; id: RegExp; src: (id: string) => string; origin: string }> = {
  youtube: { label: "YouTube", id: /^[A-Za-z0-9_-]{11}$/, src: (id) => `https://www.youtube-nocookie.com/embed/${id}`, origin: "https://www.youtube-nocookie.com" },
  vimeo: { label: "Vimeo", id: /^\d{6,12}$/, src: (id) => `https://player.vimeo.com/video/${id}?dnt=1`, origin: "https://player.vimeo.com" },
  loom: { label: "Loom", id: /^[a-f0-9]{32}$/, src: (id) => `https://www.loom.com/embed/${id}`, origin: "https://www.loom.com" },
};

/** Transforma o endereço colado pelo autor em provedor e ID. Nulo para qualquer site fora da lista. */
export function parseEmbedUrl(input: string): { provider: EmbedProvider; id: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  let result: { provider: EmbedProvider; id: string } | null = null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = url.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : undefined);
    if (id) result = { provider: "youtube", id };
  } else if (host === "youtu.be") {
    if (parts[0]) result = { provider: "youtube", id: parts[0] };
  } else if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts.find((p) => /^\d+$/.test(p));
    if (id) result = { provider: "vimeo", id };
  } else if (host === "loom.com") {
    if ((parts[0] === "share" || parts[0] === "embed") && parts[1]) result = { provider: "loom", id: parts[1] };
  }
  if (!result || !EMBED_PROVIDERS[result.provider].id.test(result.id)) return null;
  return result;
}

/* -------------------------------------------------------------------------- */
/* Validação                                                                    */
/* -------------------------------------------------------------------------- */

class DocumentError extends Error {}

const DASH = /[–—]/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Budget = { nodes: number };

function fail(message: string): never {
  throw new DocumentError(message);
}

function obj(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`Bloco inválido em ${where}.`);
  return value as Record<string, unknown>;
}

function onlyKeys(o: Record<string, unknown>, allowed: string[], where: string) {
  for (const key of Object.keys(o)) if (!allowed.includes(key)) fail(`Campo não permitido (${key}) em ${where}.`);
}

function list(value: unknown, where: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`Conteúdo inválido em ${where}.`);
  return value;
}

function tick(budget: Budget) {
  if (++budget.nodes > DOCUMENT_LIMITS.nodes) fail("O artigo passou do tamanho máximo. Divida em partes menores.");
}

function marksOf(value: unknown): Mark[] | undefined {
  const raw = list(value, "formatação");
  if (raw.length === 0) return undefined;
  const seen = new Set<string>();
  const marks: Mark[] = [];
  for (const item of raw) {
    const m = obj(item, "formatação");
    if (typeof m.type !== "string" || seen.has(m.type)) fail("Formatação inválida.");
    seen.add(m.type);
    switch (m.type) {
      case "bold":
      case "italic":
      case "strike":
      case "code":
        marks.push({ type: m.type });
        break;
      case "link": {
        const attrs = obj(m.attrs, "link");
        const href = safeHref(attrs.href);
        if (!href) fail("Um dos links usa um endereço não permitido. Use https, mailto ou um caminho do site.");
        marks.push({ type: "link", attrs: { href } });
        break;
      }
      default:
        fail(`Formatação não permitida (${m.type}).`);
    }
  }
  return marks;
}

function inline(value: unknown, budget: Budget): Inline[] | undefined {
  const items = list(value, "texto");
  const out: Inline[] = [];
  for (const item of items) {
    tick(budget);
    const n = obj(item, "texto");
    if (n.type === "hardBreak") {
      onlyKeys(n, ["type", "marks"], "quebra de linha");
      out.push({ type: "hardBreak" });
      continue;
    }
    if (n.type !== "text") fail(`Elemento não permitido no texto (${String(n.type)}).`);
    onlyKeys(n, ["type", "text", "marks"], "texto");
    if (typeof n.text !== "string" || n.text.length === 0 || n.text.length > DOCUMENT_LIMITS.text) fail("Trecho de texto inválido.");
    if (DASH.test(n.text)) fail("Use ponto, vírgula ou dois-pontos no lugar do travessão.");
    const marks = marksOf(n.marks);
    out.push(marks ? { type: "text", text: n.text, marks } : { type: "text", text: n.text });
  }
  return out.length ? out : undefined;
}

function paragraph(n: Record<string, unknown>, budget: Budget): Paragraph {
  onlyKeys(n, ["type", "content", "attrs"], "parágrafo");
  const content = inline(n.content, budget);
  return content ? { type: "paragraph", content } : { type: "paragraph" };
}

function int(value: unknown, min: number, max: number, fallback: number) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) fail("Número inválido no documento.");
  return value;
}

function listItem(value: unknown, budget: Budget, depth: number): ListItem {
  tick(budget);
  const n = obj(value, "item de lista");
  if (n.type !== "listItem") fail("Item de lista inválido.");
  onlyKeys(n, ["type", "content", "attrs"], "item de lista");
  const content = list(n.content, "item de lista").map((child) => {
    tick(budget);
    const c = obj(child, "item de lista");
    if (c.type === "paragraph") return paragraph(c, budget);
    if (c.type === "bulletList" || c.type === "orderedList") return listNode(c, budget, depth + 1);
    fail("Um item de lista só pode ter texto e sublistas.");
  });
  if (content.length === 0) fail("Item de lista vazio.");
  return { type: "listItem", content };
}

function listNode(n: Record<string, unknown>, budget: Budget, depth: number): BulletList | OrderedList {
  if (depth > DOCUMENT_LIMITS.depth) fail("Listas aninhadas demais.");
  onlyKeys(n, ["type", "content", "attrs"], "lista");
  const items = list(n.content, "lista").map((i) => listItem(i, budget, depth));
  if (items.length === 0) fail("Lista vazia.");
  if (n.type === "orderedList") {
    const attrs = n.attrs === undefined ? {} : obj(n.attrs, "lista numerada");
    onlyKeys(attrs, ["start", "type"], "lista numerada");
    return { type: "orderedList", attrs: { start: int(attrs.start, 1, 10_000, 1) }, content: items };
  }
  return { type: "bulletList", content: items };
}

function cell(value: unknown, budget: Budget): TableCell {
  tick(budget);
  const n = obj(value, "célula");
  if (n.type !== "tableCell" && n.type !== "tableHeader") fail("Célula de tabela inválida.");
  onlyKeys(n, ["type", "content", "attrs"], "célula");
  const attrs = n.attrs === undefined ? {} : obj(n.attrs, "célula");
  onlyKeys(attrs, ["colspan", "rowspan", "colwidth"], "célula");
  const content = list(n.content, "célula").map((p) => {
    tick(budget);
    const c = obj(p, "célula");
    if (c.type !== "paragraph") fail("Uma célula de tabela só pode ter texto.");
    return paragraph(c, budget);
  });
  return {
    type: n.type,
    attrs: { colspan: int(attrs.colspan, 1, DOCUMENT_LIMITS.tableCols, 1), rowspan: int(attrs.rowspan, 1, DOCUMENT_LIMITS.tableRows, 1) },
    content: content.length ? content : [{ type: "paragraph" }],
  };
}

function table(n: Record<string, unknown>, budget: Budget): Table {
  onlyKeys(n, ["type", "content", "attrs"], "tabela");
  const rows = list(n.content, "tabela");
  if (rows.length === 0 || rows.length > DOCUMENT_LIMITS.tableRows) fail(`Uma tabela precisa ter de 1 a ${DOCUMENT_LIMITS.tableRows} linhas.`);
  return {
    type: "table",
    content: rows.map((r) => {
      tick(budget);
      const row = obj(r, "linha da tabela");
      if (row.type !== "tableRow") fail("Linha de tabela inválida.");
      onlyKeys(row, ["type", "content", "attrs"], "linha da tabela");
      const cells = list(row.content, "linha da tabela");
      if (cells.length === 0 || cells.length > DOCUMENT_LIMITS.tableCols) fail(`Uma linha de tabela precisa ter de 1 a ${DOCUMENT_LIMITS.tableCols} colunas.`);
      return { type: "tableRow", content: cells.map((c) => cell(c, budget)) };
    }),
  };
}

function plain(value: unknown, max: number, what: string) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max) fail(`${what} inválido.`);
  const trimmed = value.trim();
  if (DASH.test(trimmed)) fail("Use ponto, vírgula ou dois-pontos no lugar do travessão.");
  return trimmed;
}

/** Endereço de imagem: só o armazenamento de mídia (https) ou o caminho local de desenvolvimento. */
function mediaSrc(value: unknown) {
  if (typeof value !== "string" || value.length > 1000) fail("Imagem inválida.");
  if (/^\/uploads\/[\w./-]+$/.test(value) && !value.includes("..")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.toString();
  } catch {
    /* cai no erro abaixo */
  }
  fail("Imagem inválida. Escolha a imagem pela biblioteca.");
}

function block(value: unknown, budget: Budget, depth: number): Block {
  tick(budget);
  const n = obj(value, "documento");
  switch (n.type) {
    case "paragraph":
      return paragraph(n, budget);
    case "heading": {
      onlyKeys(n, ["type", "content", "attrs"], "título");
      const attrs = obj(n.attrs, "título");
      onlyKeys(attrs, ["level", "id"], "título");
      if (attrs.level !== 2 && attrs.level !== 3 && attrs.level !== 4) fail("Use títulos de nível 2, 3 ou 4.");
      const content = inline(n.content, budget);
      return content ? { type: "heading", attrs: { level: attrs.level }, content } : { type: "heading", attrs: { level: attrs.level } };
    }
    case "bulletList":
    case "orderedList":
      return listNode(n, budget, depth + 1);
    case "blockquote": {
      onlyKeys(n, ["type", "content", "attrs"], "citação");
      const content = list(n.content, "citação").map((p) => {
        tick(budget);
        const c = obj(p, "citação");
        if (c.type !== "paragraph") fail("Uma citação só pode ter parágrafos.");
        return paragraph(c, budget);
      });
      if (content.length === 0) fail("Citação vazia.");
      return { type: "blockquote", content };
    }
    case "codeBlock": {
      onlyKeys(n, ["type", "content", "attrs"], "bloco de código");
      const attrs = n.attrs === undefined ? {} : obj(n.attrs, "bloco de código");
      onlyKeys(attrs, ["language"], "bloco de código");
      const lang = attrs.language ?? null;
      if (lang !== null && !(CODE_LANGUAGES as readonly unknown[]).includes(lang)) fail("Linguagem de código não suportada.");
      let total = 0;
      const content = list(n.content, "bloco de código").map((t) => {
        tick(budget);
        const c = obj(t, "bloco de código");
        onlyKeys(c, ["type", "text"], "bloco de código");
        if (c.type !== "text" || typeof c.text !== "string") fail("Bloco de código inválido.");
        total += c.text.length;
        return { type: "text" as const, text: c.text };
      });
      if (total > DOCUMENT_LIMITS.code) fail("Bloco de código longo demais.");
      const code: CodeBlock = { type: "codeBlock", attrs: { language: lang as string | null } };
      return content.length ? { ...code, content } : code;
    }
    case "horizontalRule":
      onlyKeys(n, ["type"], "divisor");
      return { type: "horizontalRule" };
    case "figure": {
      onlyKeys(n, ["type", "attrs"], "imagem");
      const attrs = obj(n.attrs, "imagem");
      onlyKeys(attrs, ["mediaId", "src", "alt", "caption", "width", "height"], "imagem");
      if (typeof attrs.mediaId !== "string" || !UUID.test(attrs.mediaId)) fail("Imagem inválida. Escolha a imagem pela biblioteca.");
      const alt = plain(attrs.alt, 300, "Texto alternativo");
      if (!alt) fail("Descreva cada imagem no texto alternativo.");
      return {
        type: "figure",
        attrs: {
          mediaId: attrs.mediaId.toLowerCase(),
          src: mediaSrc(attrs.src),
          alt,
          caption: plain(attrs.caption, 300, "Legenda"),
          width: int(attrs.width, 1, 10_000, 1600),
          height: int(attrs.height, 1, 10_000, 900),
        },
      };
    }
    case "embed": {
      onlyKeys(n, ["type", "attrs"], "vídeo");
      const attrs = obj(n.attrs, "vídeo");
      onlyKeys(attrs, ["provider", "id", "title"], "vídeo");
      const provider = attrs.provider as EmbedProvider;
      if (!Object.hasOwn(EMBED_PROVIDERS, provider)) fail("Só é possível incorporar vídeos do YouTube, Vimeo ou Loom.");
      if (typeof attrs.id !== "string" || !EMBED_PROVIDERS[provider].id.test(attrs.id)) fail("Endereço de vídeo inválido.");
      const title = plain(attrs.title, 160, "Título do vídeo") || `Vídeo no ${EMBED_PROVIDERS[provider].label}`;
      return { type: "embed", attrs: { provider, id: attrs.id, title } };
    }
    case "table":
      return table(n, budget);
    default:
      fail(`Bloco não permitido (${String(n.type)}).`);
  }
}

export type ParseResult = { ok: true; document: BlogDocument } | { ok: false; error: string };

/** Valida e reconstrói o documento. Tudo que não está na lista fechada é recusado. */
export function parseDocument(input: unknown): ParseResult {
  try {
    const size = JSON.stringify(input ?? null).length;
    if (size > DOCUMENT_LIMITS.bytes) fail("O artigo passou do tamanho máximo. Divida em partes menores.");
    const root = obj(input, "documento");
    if (root.type !== "doc") fail("Documento inválido.");
    onlyKeys(root, ["type", "content"], "documento");
    const budget = { nodes: 0 };
    const content = list(root.content, "documento").map((b) => block(b, budget, 0));
    return { ok: true, document: { type: "doc", content: content.length ? content : [{ type: "paragraph" }] } };
  } catch (error) {
    if (error instanceof DocumentError) return { ok: false, error: error.message };
    return { ok: false, error: "Documento inválido." };
  }
}

/* -------------------------------------------------------------------------- */
/* Derivados: texto, títulos, tempo de leitura, mídias                          */
/* -------------------------------------------------------------------------- */

export function inlineText(content: Inline[] | undefined) {
  return (content ?? []).map((i) => (i.type === "text" ? i.text : " ")).join("");
}

function walk(blocks: Block[] | ListItem["content"], visit: (b: Block) => void) {
  for (const b of blocks) {
    visit(b as Block);
    if (b.type === "bulletList" || b.type === "orderedList") for (const item of b.content) walk(item.content, visit);
  }
}

/** Texto puro do artigo (busca, contagem de palavras, resumo automático). Código e tabelas entram. */
export function documentText(doc: BlogDocument) {
  const parts: string[] = [];
  walk(doc.content, (b) => {
    switch (b.type) {
      case "paragraph":
      case "heading":
        parts.push(inlineText(b.content));
        break;
      case "blockquote":
        for (const p of b.content) parts.push(inlineText(p.content));
        break;
      case "codeBlock":
        parts.push((b.content ?? []).map((t) => t.text).join(""));
        break;
      case "figure":
        if (b.attrs.caption) parts.push(b.attrs.caption);
        break;
      case "table":
        for (const row of b.content) for (const c of row.content) for (const p of c.content) parts.push(inlineText(p.content));
        break;
    }
  });
  return parts.filter(Boolean).join("\n");
}

export function wordCount(text: string) {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Cerca de 200 palavras por minuto, a média usada para leitura de texto técnico em português. */
export const WORDS_PER_MINUTE = 200;

export function readingMinutes(words: number) {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** "Segurança em 2026" vira "seguranca-em-2026". */
export function anchorOf(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "secao"
  );
}

export type TocEntry = { id: string; text: string; level: 2 | 3 | 4 };

/** Títulos do artigo com âncoras únicas, na ordem do texto (o sumário e o renderer usam os mesmos ids). */
export function headingsOf(doc: BlogDocument): TocEntry[] {
  const used = new Map<string, number>();
  const out: TocEntry[] = [];
  for (const b of doc.content) {
    if (b.type !== "heading") continue;
    const text = inlineText(b.content).trim();
    if (!text) continue;
    const base = anchorOf(text);
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    out.push({ id: n ? `${base}-${n + 1}` : base, text, level: b.attrs.level });
  }
  return out;
}

export function mediaIdsOf(doc: BlogDocument) {
  const ids: string[] = [];
  walk(doc.content, (b) => {
    if (b.type === "figure") ids.push(b.attrs.mediaId);
  });
  return [...new Set(ids)];
}

export function documentStats(doc: BlogDocument) {
  const words = wordCount(documentText(doc));
  return { words, minutes: readingMinutes(words) };
}
