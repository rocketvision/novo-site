import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleBody } from "@/components/blog/article-body";
import {
  documentStats,
  headingsOf,
  mediaIdsOf,
  parseDocument,
  parseEmbedUrl,
  readingMinutes,
  safeHref,
  type BlogDocument,
} from "@/lib/blog/document";
import { availableActions, canEditContent, canTransition } from "@/lib/blog/workflow";
import type { Permission } from "@/server/authz/permissions";

const MEDIA_ID = "0b6f3c1e-8a3d-4a57-9d2e-1f0c6a7b8e90";

const valid = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Por que isso importa" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Veja o " },
        { type: "text", text: "guia do NIST", marks: [{ type: "link", attrs: { href: "https://www.nist.gov/", target: "_blank" } }, { type: "bold" }] },
        { type: "hardBreak" },
        { type: "text", text: "e siga.", marks: [{ type: "italic" }] },
      ],
    },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Um" }] }] }] },
    { type: "orderedList", attrs: { start: 3, type: null }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Três" }] }] }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Citação" }] }] },
    { type: "codeBlock", attrs: { language: "typescript" }, content: [{ type: "text", text: "const a: number = 1;" }] },
    { type: "figure", attrs: { mediaId: MEDIA_ID, src: "https://blob.example.com/a.webp", alt: "Diagrama", caption: "Fluxo", width: 1600, height: 900 } },
    { type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ", title: "Palestra" } },
    {
      type: "table",
      content: [
        { type: "tableRow", content: [{ type: "tableHeader", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph", content: [{ type: "text", text: "Item" }] }] }] },
        { type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph", content: [{ type: "text", text: "Valor" }] }] }] },
      ],
    },
    { type: "horizontalRule" },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Por que isso importa" }] },
  ],
};

function withBlock(block: unknown) {
  return { type: "doc", content: [block] };
}

describe("documento do blog", () => {
  it("aceita um documento completo e descarta atributos do editor que não são guardados", () => {
    const result = parseDocument(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const link = (result.document.content[1] as { content: { marks?: unknown[] }[] }).content[1].marks?.[0];
    expect(link).toEqual({ type: "link", attrs: { href: "https://www.nist.gov/" } });
  });

  it.each([
    ["link javascript:", withBlock({ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] })],
    ["link data:", withBlock({ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "data:text/html,<script>1</script>" } }] }] })],
    ["link protocol-relative", withBlock({ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "//evil.com" } }] }] })],
    ["nó de HTML", withBlock({ type: "html", content: "<script>alert(1)</script>" })],
    ["nó desconhecido", withBlock({ type: "iframe", attrs: { src: "https://evil.com" } })],
    ["atributo extra", withBlock({ type: "paragraph", attrs: { onclick: "x" }, content: [{ type: "text", text: "x", style: "color:red" }] })],
    ["marca desconhecida", withBlock({ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "textStyle", attrs: { color: "red" } }] }] })],
    ["embed fora da lista", withBlock({ type: "embed", attrs: { provider: "evil", id: "x", title: "t" } })],
    ["embed com id forjado", withBlock({ type: "embed", attrs: { provider: "youtube", id: "x\"><script>", title: "t" } })],
    ["imagem sem alt", withBlock({ type: "figure", attrs: { mediaId: MEDIA_ID, src: "https://a.com/a.webp", alt: "", caption: "", width: 1, height: 1 } })],
    ["imagem com src javascript:", withBlock({ type: "figure", attrs: { mediaId: MEDIA_ID, src: "javascript:alert(1)", alt: "a", caption: "", width: 1, height: 1 } })],
    ["título h1", withBlock({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "x" }] })],
    ["linguagem de código desconhecida", withBlock({ type: "codeBlock", attrs: { language: "<img>" }, content: [{ type: "text", text: "x" }] })],
    ["travessão", withBlock({ type: "paragraph", content: [{ type: "text", text: "isso — aquilo" }] })],
    ["raiz que não é doc", { type: "paragraph" }],
    ["string", "<p>oi</p>"],
  ])("recusa %s", (_label, input) => {
    expect(parseDocument(input).ok).toBe(false);
  });

  it("recusa documento grande demais", () => {
    const big = { type: "doc", content: Array.from({ length: 9000 }, () => ({ type: "horizontalRule" })) };
    expect(parseDocument(big).ok).toBe(false);
  });

  it("gera âncoras únicas para títulos repetidos", () => {
    const result = parseDocument(valid);
    if (!result.ok) throw new Error(result.error);
    expect(headingsOf(result.document).map((h) => h.id)).toEqual(["por-que-isso-importa", "por-que-isso-importa-2"]);
    expect(mediaIdsOf(result.document)).toEqual([MEDIA_ID]);
  });

  it("calcula o tempo de leitura", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1000)).toBe(5);
    const doc: BlogDocument = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: Array(400).fill("palavra").join(" ") }] }] };
    expect(documentStats(doc)).toEqual({ words: 400, minutes: 2 });
  });
});

describe("links e vídeos", () => {
  it.each(["https://owasp.org/Top10/", "http://exemplo.com", "mailto:oi@rocketvision.dev", "/blog", "#referencias"])("aceita %s", (v) => expect(safeHref(v)).not.toBeNull());
  it.each(["javascript:alert(1)", " JaVaScRiPt:alert(1)", "vbscript:x", "//evil.com", "/\\evil.com", "file:///etc/passwd", "https://exa mple.com"])("recusa %s", (v) =>
    expect(safeHref(v)).toBeNull(),
  );

  it("reconhece só YouTube, Vimeo e Loom", () => {
    expect(parseEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseEmbedUrl("https://youtu.be/dQw4w9WgXcQ?t=10")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseEmbedUrl("https://vimeo.com/76979871")).toEqual({ provider: "vimeo", id: "76979871" });
    expect(parseEmbedUrl("https://www.loom.com/share/0123456789abcdef0123456789abcdef")).toEqual({ provider: "loom", id: "0123456789abcdef0123456789abcdef" });
    expect(parseEmbedUrl("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseEmbedUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseEmbedUrl("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("renderer", () => {
  it("gera HTML sem scripts, com links externos seguros e iframe restrito", () => {
    const result = parseDocument(valid);
    if (!result.ok) throw new Error(result.error);
    const html = renderToStaticMarkup(createElement(ArticleBody, { document: result.document }));
    expect(html).toContain('<h2 id="por-que-isso-importa">');
    expect(html).toContain('<h3 id="por-que-isso-importa-2">');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain("sandbox=");
    expect(html).toContain('class="hljs-keyword"');
    expect(html).toContain('<ol start="3">');
    expect(html).not.toMatch(/<script|javascript:/i);
  });

  it("escapa texto que parece HTML", () => {
    const result = parseDocument(withBlock({ type: "paragraph", content: [{ type: "text", text: "<img src=x onerror=alert(1)>" }] }));
    if (!result.ok) throw new Error(result.error);
    const html = renderToStaticMarkup(createElement(ArticleBody, { document: result.document }));
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});

describe("fluxo editorial", () => {
  const who = (perms: Permission[], isOwner: boolean) => ({ can: (p: Permission) => perms.includes(p), isOwner });
  const columnist = (isOwner = true) => who(["blog.view", "blog.create", "blog.edit_own"], isOwner);
  const editor = who(["blog.view", "blog.create", "blog.edit_own", "blog.edit_any", "blog.review", "blog.approve", "blog.publish", "blog.delete"], false);

  it("o autor envia o próprio rascunho, mas não aprova nem publica", () => {
    expect(availableActions("draft", columnist())).toEqual(["submit"]);
    expect(canTransition("approve", "in_review", columnist())).toBe(false);
    expect(canTransition("publish", "approved", columnist())).toBe(false);
  });

  it("o autor não mexe no artigo de outra pessoa", () => {
    expect(availableActions("draft", columnist(false))).toEqual([]);
    expect(canEditContent("draft", columnist(false))).toBe(false);
  });

  it("o autor edita em rascunho e em revisão, e não depois de aprovado", () => {
    expect(canEditContent("draft", columnist())).toBe(true);
    expect(canEditContent("in_review", columnist())).toBe(true);
    expect(canEditContent("approved", columnist())).toBe(false);
    expect(canEditContent("published", columnist())).toBe(false);
  });

  it("o editor aprova, agenda, publica e arquiva", () => {
    expect(availableActions("in_review", editor)).toEqual(["request_changes", "approve", "archive"]);
    expect(availableActions("approved", editor)).toEqual(["request_changes", "publish", "schedule", "archive"]);
    expect(availableActions("scheduled", editor)).toEqual(["publish", "schedule", "unschedule"]);
    expect(availableActions("published", editor)).toEqual(["publish", "unpublish", "archive"]);
    expect(canTransition("publish", "draft", editor)).toBe(false);
  });
});
