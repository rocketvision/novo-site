"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { mergeAttributes, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Undo2,
  Unlink,
  Video,
} from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Input, Select } from "@/components/cms/ui/field";
import { MediaPicker } from "@/components/cms/media/media-picker";
import { CODE_LANGUAGES, EMBED_PROVIDERS, parseEmbedUrl, safeHref, type BlogDocument, type EmbedProvider } from "@/lib/blog/document";
import { CODE_LANGUAGE_LABELS, lowlight } from "@/lib/blog/highlight";
import { cn } from "@/lib/utils";

/**
 * Editor rico do Blog (Tiptap). Produz o JSON que o servidor valida com parseDocument.
 * Só existem aqui os nós que o site sabe mostrar: colar HTML de outro lugar vira só texto, títulos,
 * listas, links e tabelas. Nada de estilos, scripts ou iframes arbitrários.
 */

/* -------------------------------------------------------------------------- */
/* Nós próprios: imagem com legenda e vídeo incorporado                         */
/* -------------------------------------------------------------------------- */

const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      mediaId: { default: null },
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
      width: { default: 1600 },
      height: { default: 900 },
    };
  },
  parseHTML() {
    // Só figuras criadas por este editor (colagem de <img> de fora não vira imagem sem passar pela biblioteca).
    return [{ tag: "figure[data-rv-figure]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const { src, alt, caption } = HTMLAttributes as { src: string; alt: string; caption: string };
    return [
      "figure",
      mergeAttributes({ "data-rv-figure": "", class: "rv-editor-figure" }),
      ["img", { src, alt, draggable: "false" }],
      ["figcaption", {}, caption || "Sem legenda"],
    ];
  },
});

const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { provider: { default: "youtube" }, id: { default: "" }, title: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-rv-embed]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const { provider, title } = HTMLAttributes as { provider: EmbedProvider; title: string };
    const label = EMBED_PROVIDERS[provider]?.label ?? "Vídeo";
    return ["div", { "data-rv-embed": "", class: "rv-editor-embed" }, ["span", {}, `Vídeo do ${label}`], ["strong", {}, title || "Sem título"]];
  },
});

/* -------------------------------------------------------------------------- */
/* Editor                                                                       */
/* -------------------------------------------------------------------------- */

type Props = {
  value: BlogDocument;
  onChange: (doc: BlogDocument) => void;
  readOnly?: boolean;
  canUpload: boolean;
  mediaEndpoint: string;
  onSaveShortcut?: () => void;
};

export function RichEditor({ value, onChange, readOnly, canUpload, mediaEndpoint, onSaveShortcut }: Props) {
  const [picking, setPicking] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const saveRef = useRef(onSaveShortcut);
  useEffect(() => {
    saveRef.current = onSaveShortcut;
  });

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
          isAllowedUri: (url) => safeHref(url) !== null,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
        },
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: "Comece a escrever. Títulos, listas, imagens, vídeos e tabelas estão na barra acima." }),
      Figure,
      Embed,
    ],
    content: value,
    editorProps: {
      attributes: { class: "blog-prose rv-editor-content", "aria-label": "Texto do artigo", role: "textbox", "aria-multiline": "true" },
      handleKeyDown: (_view, event) => {
        const mod = event.metaKey || event.ctrlKey;
        if (mod && event.key.toLowerCase() === "s") {
          event.preventDefault();
          saveRef.current?.();
          return true;
        }
        if (mod && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setLinkOpen(true);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as BlogDocument),
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  // Conteúdo trocado de fora (restaurar revisão ou recuperar cópia local): recarrega o editor.
  const lastExternal = useRef(value);
  useEffect(() => {
    if (!editor || value === lastExternal.current) return;
    lastExternal.current = value;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="min-h-[28rem] rounded-lg border border-zinc-200 bg-white" aria-busy="true" />;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      {!readOnly && <Toolbar editor={editor} onImage={() => setPicking(true)} onLink={() => setLinkOpen((v) => !v)} onEmbed={() => setEmbedOpen((v) => !v)} />}
      {linkOpen && !readOnly && <LinkRow editor={editor} onClose={() => setLinkOpen(false)} />}
      {embedOpen && !readOnly && <EmbedRow editor={editor} onClose={() => setEmbedOpen(false)} />}
      {!readOnly && <NodePanel editor={editor} />}

      {!readOnly && (
        <BubbleMenu editor={editor} shouldShow={({ editor: e, from, to }) => from !== to && !e.isActive("figure") && !e.isActive("embed") && !e.isActive("codeBlock")}>
          <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
            <Tool editor={editor} label="Negrito (Ctrl+B)" active="bold" onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="size-4" />
            </Tool>
            <Tool editor={editor} label="Itálico (Ctrl+I)" active="italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="size-4" />
            </Tool>
            <Tool editor={editor} label="Código" active="code" onClick={() => editor.chain().focus().toggleCode().run()}>
              <Code className="size-4" />
            </Tool>
            <Tool editor={editor} label="Link (Ctrl+K)" active="link" onClick={() => setLinkOpen(true)}>
              <Link2 className="size-4" />
            </Tool>
          </div>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} className="px-5 py-5 sm:px-8" />

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        canUpload={canUpload}
        endpoint={mediaEndpoint}
        title="Inserir imagem no texto"
        onPick={(m) =>
          editor
            .chain()
            .focus()
            .insertContent({ type: "figure", attrs: { mediaId: m.id, src: m.url, alt: m.alt, caption: "", width: m.width, height: m.height } })
            .run()
        }
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Barra de ferramentas                                                         */
/* -------------------------------------------------------------------------- */

function Tool({
  editor,
  label,
  active,
  activeAttrs,
  disabled,
  onClick,
  children,
}: {
  editor: Editor;
  label: string;
  active?: string;
  activeAttrs?: Record<string, unknown>;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const isActive = useEditorState({ editor, selector: ({ editor: e }) => (active ? e.isActive(active, activeAttrs) : false) });
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ? isActive : undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-30",
        isActive && "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-zinc-200" />;
}

function Toolbar({ editor, onImage, onLink, onEmbed }: { editor: Editor; onImage: () => void; onLink: () => void; onEmbed: () => void }) {
  const state = useEditorState({ editor, selector: ({ editor: e }) => ({ undo: e.can().undo(), redo: e.can().redo(), inTable: e.isActive("table") }) });
  return (
    <div role="toolbar" aria-label="Formatação" className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-zinc-200 bg-white/95 px-2 py-1.5 backdrop-blur">
      <Tool editor={editor} label="Título de seção (Ctrl+Alt+2)" active="heading" activeAttrs={{ level: 2 }} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </Tool>
      <Tool editor={editor} label="Subtítulo (Ctrl+Alt+3)" active="heading" activeAttrs={{ level: 3 }} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" />
      </Tool>
      <Tool editor={editor} label="Título menor (Ctrl+Alt+4)" active="heading" activeAttrs={{ level: 4 }} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
        <Heading4 className="size-4" />
      </Tool>
      <Sep />
      <Tool editor={editor} label="Negrito (Ctrl+B)" active="bold" onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </Tool>
      <Tool editor={editor} label="Itálico (Ctrl+I)" active="italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </Tool>
      <Tool editor={editor} label="Tachado" active="strike" onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-4" />
      </Tool>
      <Tool editor={editor} label="Código no texto" active="code" onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="size-4" />
      </Tool>
      <Tool editor={editor} label="Link (Ctrl+K)" active="link" onClick={onLink}>
        <Link2 className="size-4" />
      </Tool>
      <Sep />
      <Tool editor={editor} label="Lista" active="bulletList" onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </Tool>
      <Tool editor={editor} label="Lista numerada" active="orderedList" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </Tool>
      <Tool editor={editor} label="Citação" active="blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-4" />
      </Tool>
      <Tool editor={editor} label="Bloco de código" active="codeBlock" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <SquareCode className="size-4" />
      </Tool>
      <Tool editor={editor} label="Divisor" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="size-4" />
      </Tool>
      <Sep />
      <Tool editor={editor} label="Imagem" onClick={onImage}>
        <ImagePlus className="size-4" />
      </Tool>
      <Tool editor={editor} label="Vídeo (YouTube, Vimeo ou Loom)" onClick={onEmbed}>
        <Video className="size-4" />
      </Tool>
      <Tool editor={editor} label="Tabela" active="table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <TableIcon className="size-4" />
      </Tool>
      <span className="flex-1" />
      <Tool editor={editor} label="Desfazer (Ctrl+Z)" disabled={!state.undo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-4" />
      </Tool>
      <Tool editor={editor} label="Refazer (Ctrl+Shift+Z)" disabled={!state.redo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-4" />
      </Tool>
      {state.inTable && (
        <div className="flex w-full flex-wrap items-center gap-1 border-t border-zinc-100 pt-1.5 text-[12px]">
          <span className="px-1 text-zinc-500">Tabela:</span>
          <TableBtn onClick={() => editor.chain().focus().addRowAfter().run()}>+ linha</TableBtn>
          <TableBtn onClick={() => editor.chain().focus().addColumnAfter().run()}>+ coluna</TableBtn>
          <TableBtn onClick={() => editor.chain().focus().deleteRow().run()}>− linha</TableBtn>
          <TableBtn onClick={() => editor.chain().focus().deleteColumn().run()}>− coluna</TableBtn>
          <TableBtn onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Cabeçalho</TableBtn>
          <TableBtn onClick={() => editor.chain().focus().deleteTable().run()}>Remover tabela</TableBtn>
        </div>
      )}
    </div>
  );
}

function TableBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100">
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Link, vídeo e painel do bloco selecionado                                    */
/* -------------------------------------------------------------------------- */

function LinkRow({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [href, setHref] = useState(current);
  const [error, setError] = useState<string | null>(null);

  function apply() {
    const value = href.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return onClose();
    }
    const normalized = /^(https?:|mailto:|\/|#)/i.test(value) ? value : `https://${value}`;
    const safe = safeHref(normalized);
    if (!safe) return setError("Use um endereço https, mailto, um caminho do site (/blog) ou uma âncora (#secao).");
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) chain.insertContent({ type: "text", text: value, marks: [{ type: "link", attrs: { href: safe } }] }).run();
    else chain.setLink({ href: safe }).run();
    onClose();
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <label htmlFor="rv-link" className="text-[13px] font-medium text-zinc-700">
        Link
      </label>
      <Input id="rv-link" autoFocus value={href} onChange={(e) => (setHref(e.target.value), setError(null))} placeholder="https://" className="h-8 max-w-md flex-1" aria-invalid={error ? true : undefined} />
      <Button type="submit" size="sm">
        Aplicar
      </Button>
      {current && (
        <Button size="sm" variant="ghost" onClick={() => (editor.chain().focus().extendMarkRange("link").unsetLink().run(), onClose())}>
          <Unlink className="size-3.5" /> Remover
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onClose}>
        Cancelar
      </Button>
      {error && (
        <p role="alert" className="w-full text-[13px] text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

function EmbedRow({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseEmbedUrl(url);
        if (!parsed) return setError("Cole o endereço de um vídeo do YouTube, do Vimeo ou do Loom.");
        if (!title.trim()) return setError("Dê um título ao vídeo (ajuda quem usa leitor de tela).");
        editor.chain().focus().insertContent({ type: "embed", attrs: { ...parsed, title: title.trim().slice(0, 160) } }).run();
        onClose();
      }}
    >
      <Input aria-label="Endereço do vídeo" autoFocus value={url} onChange={(e) => (setUrl(e.target.value), setError(null))} placeholder="https://www.youtube.com/watch?v=..." className="h-8 min-w-60 flex-1" />
      <Input aria-label="Título do vídeo" value={title} onChange={(e) => (setTitle(e.target.value), setError(null))} placeholder="Título do vídeo" className="h-8 min-w-48 flex-1" maxLength={160} />
      <Button type="submit" size="sm">
        Inserir
      </Button>
      <Button size="sm" variant="ghost" onClick={onClose}>
        Cancelar
      </Button>
      {error && (
        <p role="alert" className="w-full text-[13px] text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

/** Ajustes do bloco selecionado: texto alternativo e legenda da imagem, linguagem do código, título do vídeo. */
function NodePanel({ editor }: { editor: Editor }) {
  const selected = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (e.isActive("figure")) return { type: "figure" as const, attrs: e.getAttributes("figure") };
      if (e.isActive("embed")) return { type: "embed" as const, attrs: e.getAttributes("embed") };
      if (e.isActive("codeBlock")) return { type: "codeBlock" as const, attrs: e.getAttributes("codeBlock") };
      return null;
    },
  });
  if (!selected) return null;

  const update = (attrs: Record<string, unknown>) => editor.chain().updateAttributes(selected.type, attrs).run();
  const remove = () => editor.chain().focus().deleteSelection().run();

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-zinc-100 bg-amber-50/40 px-3 py-2 text-[13px]">
      {selected.type === "figure" && (
        <>
          <label className="flex min-w-56 flex-1 flex-col gap-1">
            <span className="font-medium text-zinc-700">Texto alternativo (obrigatório)</span>
            <Input className="h-8" value={String(selected.attrs.alt ?? "")} maxLength={300} onChange={(e) => update({ alt: e.target.value })} aria-invalid={!selected.attrs.alt || undefined} />
          </label>
          <label className="flex min-w-56 flex-1 flex-col gap-1">
            <span className="font-medium text-zinc-700">Legenda</span>
            <Input className="h-8" value={String(selected.attrs.caption ?? "")} maxLength={300} onChange={(e) => update({ caption: e.target.value })} />
          </label>
        </>
      )}
      {selected.type === "embed" && (
        <label className="flex min-w-56 flex-1 flex-col gap-1">
          <span className="font-medium text-zinc-700">Título do vídeo</span>
          <Input className="h-8" value={String(selected.attrs.title ?? "")} maxLength={160} onChange={(e) => update({ title: e.target.value })} />
        </label>
      )}
      {selected.type === "codeBlock" && (
        <label className="flex min-w-48 flex-col gap-1">
          <span className="font-medium text-zinc-700">Linguagem</span>
          <Select className="h-8" value={String(selected.attrs.language ?? "")} onChange={(e) => update({ language: e.target.value || null })}>
            <option value="">Sem realce</option>
            {CODE_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {CODE_LANGUAGE_LABELS[l] ?? l}
              </option>
            ))}
          </Select>
        </label>
      )}
      {selected.type !== "codeBlock" && (
        <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={remove}>
          <Trash2 className="size-3.5" /> Remover
        </Button>
      )}
    </div>
  );
}
