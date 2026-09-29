import type { Block, BlogDocument, Inline, ListItem, Mark, Paragraph } from "../../src/lib/blog/document";

/**
 * Conversor mínimo de Markdown para o documento do Blog, usado só pelo seed dos artigos iniciais.
 * Aceita: ## / ### / #### títulos, parágrafos, listas (- e 1.), citação (>), bloco de código (```lang),
 * divisor (---), **negrito**, *itálico*, `código` e [links](https://...).
 * O resultado passa pelo mesmo parseDocument da API antes de ser gravado.
 */

function inline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  const push = (t: string, marks?: Mark[]) => t && out.push(marks?.length ? { type: "text", text: t, marks } : { type: "text", text: t });
  for (const m of text.matchAll(re)) {
    push(text.slice(last, m.index));
    if (m[1] !== undefined) push(m[1], [{ type: "bold" }]);
    else if (m[2] !== undefined) push(m[2], [{ type: "italic" }]);
    else if (m[3] !== undefined) push(m[3], [{ type: "code" }]);
    else push(m[4], [{ type: "link", attrs: { href: m[5] } }]);
    last = (m.index ?? 0) + m[0].length;
  }
  push(text.slice(last));
  return out;
}

const para = (text: string): Paragraph => ({ type: "paragraph", content: inline(text) });

export function markdownToDocument(md: string): BlogDocument {
  const lines = md.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{2,4}) (.+)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", attrs: { level: heading[1].length as 2 | 3 | 4 }, content: inline(heading[2].trim()) });
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const language = line.slice(3).trim() || null;
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push({ type: "codeBlock", attrs: { language }, content: [{ type: "text", text: code.join("\n") }] });
      continue;
    }
    if (line.trim() === "---") {
      blocks.push({ type: "horizontalRule" });
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      const quote: Paragraph[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) quote.push(para(lines[i++].slice(2)));
      blocks.push({ type: "blockquote", content: quote });
      continue;
    }
    const bullet = /^- (.+)$/;
    const ordered = /^\d+\. (.+)$/;
    if (bullet.test(line) || ordered.test(line)) {
      const isOrdered = ordered.test(line);
      const re = isOrdered ? ordered : bullet;
      const items: ListItem[] = [];
      while (i < lines.length && re.test(lines[i])) items.push({ type: "listItem", content: [para(re.exec(lines[i++])![1])] });
      blocks.push(isOrdered ? { type: "orderedList", attrs: { start: 1 }, content: items } : { type: "bulletList", content: items });
      continue;
    }
    // Parágrafo: linhas seguidas até uma linha vazia.
    const text: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,4} |```|> |- |\d+\. |---$)/.test(lines[i])) text.push(lines[i++].trim());
    blocks.push(para(text.join(" ")));
  }
  return { type: "doc", content: blocks };
}

/** Front matter simples: chave: valor por linha, entre linhas "---". Listas com "- " abaixo da chave. */
export function splitFrontMatter(source: string) {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source.replace(/\r/g, ""));
  if (!match) throw new Error("Artigo sem front matter.");
  const meta: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const line of match[1].split("\n")) {
    const item = /^\s+- (.+)$/.exec(line);
    if (item && listKey) {
      (meta[listKey] as string[]).push(item[1].trim());
      continue;
    }
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    if (kv[2] === "") {
      listKey = kv[1];
      meta[listKey] = [];
    } else {
      listKey = null;
      meta[kv[1]] = kv[2].trim();
    }
  }
  return { meta, body: match[2] };
}
