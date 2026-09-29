import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import type { Element as HastElement, RootContent } from "hast";
import {
  EMBED_PROVIDERS,
  headingsOf,
  inlineText,
  isExternalHref,
  type Block,
  type BlogDocument,
  type Inline,
  type ListItem,
  type Paragraph,
} from "@/lib/blog/document";
import { lowlight, CODE_LANGUAGE_LABELS } from "@/lib/blog/highlight";

/**
 * Corpo do artigo. Percorre o documento já validado e gera React, sem HTML do autor.
 * Usado no site público e na pré-visualização do Studio, para os dois mostrarem exatamente o mesmo.
 */

export type BodyMedia = Record<string, { url: string; width: number; height: number; blurDataUrl: string | null }>;

function renderInline(content: Inline[] | undefined, key = "i"): ReactNode {
  return (content ?? []).map((node, i) => {
    if (node.type === "hardBreak") return <br key={`${key}${i}`} />;
    let el: ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold":
          el = <strong>{el}</strong>;
          break;
        case "italic":
          el = <em>{el}</em>;
          break;
        case "strike":
          el = <s>{el}</s>;
          break;
        case "code":
          el = <code>{el}</code>;
          break;
        case "link": {
          const external = isExternalHref(mark.attrs.href);
          el = (
            <a href={mark.attrs.href} {...(external && { target: "_blank", rel: "noopener noreferrer nofollow" })}>
              {el}
            </a>
          );
          break;
        }
      }
    }
    return <Fragment key={`${key}${i}`}>{el}</Fragment>;
  });
}

function paragraph(p: Paragraph, key: string) {
  return <p key={key}>{renderInline(p.content, key)}</p>;
}

function hast(nodes: RootContent[], key: string): ReactNode {
  return nodes.map((node, i) => {
    if (node.type === "text") return node.value;
    if (node.type !== "element") return null;
    const el = node as HastElement;
    const className = Array.isArray(el.properties?.className) ? el.properties.className.filter((c) => typeof c === "string" && c.startsWith("hljs")).join(" ") : undefined;
    return (
      <span key={`${key}${i}`} className={className}>
        {hast(el.children as RootContent[], `${key}${i}.`)}
      </span>
    );
  });
}

function listItems(items: ListItem[], key: string) {
  return items.map((item, i) => (
    <li key={`${key}${i}`}>
      {item.content.map((c, j) => (c.type === "paragraph" ? paragraph(c, `${key}${i}.${j}`) : list(c, `${key}${i}.${j}`)))}
    </li>
  ));
}

function list(b: Extract<Block, { type: "bulletList" | "orderedList" }>, key: string) {
  return b.type === "bulletList" ? (
    <ul key={key}>{listItems(b.content, key)}</ul>
  ) : (
    <ol key={key} start={b.attrs.start === 1 ? undefined : b.attrs.start}>
      {listItems(b.content, key)}
    </ol>
  );
}

export function ArticleBody({ document, media = {} }: { document: BlogDocument; media?: BodyMedia }) {
  const anchors = headingsOf(document).map((h) => h.id);
  let h = 0;

  return (
    <div className="blog-prose">
      {document.content.map((b, i) => {
        const key = `b${i}`;
        switch (b.type) {
          case "paragraph":
            return b.content ? paragraph(b, key) : null;
          case "heading": {
            if (!inlineText(b.content).trim()) return null;
            const Tag = `h${b.attrs.level}` as "h2" | "h3" | "h4";
            const id = anchors[h++];
            return (
              <Tag key={key} id={id}>
                {renderInline(b.content, key)}
              </Tag>
            );
          }
          case "bulletList":
          case "orderedList":
            return list(b, key);
          case "blockquote":
            return <blockquote key={key}>{b.content.map((p, j) => paragraph(p, `${key}.${j}`))}</blockquote>;
          case "codeBlock": {
            const code = (b.content ?? []).map((t) => t.text).join("");
            const lang = b.attrs.language && lowlight.registered(b.attrs.language) ? b.attrs.language : null;
            const tree = lang && lang !== "plaintext" ? lowlight.highlight(lang, code) : null;
            return (
              <figure key={key} className="blog-code">
                {lang && <figcaption>{CODE_LANGUAGE_LABELS[lang] ?? lang}</figcaption>}
                <pre tabIndex={0}>
                  <code className="hljs">{tree ? hast(tree.children, key) : code}</code>
                </pre>
              </figure>
            );
          }
          case "horizontalRule":
            return <hr key={key} />;
          case "figure": {
            const m = media[b.attrs.mediaId];
            const src = m?.url ?? b.attrs.src;
            const width = m?.width ?? b.attrs.width;
            const height = m?.height ?? b.attrs.height;
            return (
              <figure key={key} className="blog-figure">
                <Image
                  src={src}
                  alt={b.attrs.alt}
                  width={width}
                  height={height}
                  sizes="(min-width: 1024px) 760px, 100vw"
                  {...(m?.blurDataUrl && { placeholder: "blur" as const, blurDataURL: m.blurDataUrl })}
                />
                {b.attrs.caption && <figcaption>{b.attrs.caption}</figcaption>}
              </figure>
            );
          }
          case "embed": {
            const provider = EMBED_PROVIDERS[b.attrs.provider];
            return (
              <figure key={key} className="blog-embed">
                <div className="blog-embed-frame">
                  <iframe
                    src={provider.src(b.attrs.id)}
                    title={b.attrs.title}
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                  />
                </div>
                <figcaption>{b.attrs.title}</figcaption>
              </figure>
            );
          }
          case "table":
            return (
              <div key={key} className="blog-table" tabIndex={0} role="region" aria-label="Tabela">
                <table>
                  <tbody>
                    {b.content.map((row, r) => (
                      <tr key={r}>
                        {row.content.map((cell, c) => {
                          const Cell = cell.type === "tableHeader" ? "th" : "td";
                          return (
                            <Cell
                              key={c}
                              colSpan={cell.attrs.colspan > 1 ? cell.attrs.colspan : undefined}
                              rowSpan={cell.attrs.rowspan > 1 ? cell.attrs.rowspan : undefined}
                              {...(Cell === "th" && { scope: r === 0 ? "col" : "row" })}
                            >
                              {cell.content.map((p, j) => (
                                <Fragment key={j}>{renderInline(p.content, `${key}.${r}.${c}.${j}`)}</Fragment>
                              ))}
                            </Cell>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
