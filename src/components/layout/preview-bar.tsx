/**
 * Aviso fixo mostrado só na pré-visualização (sessão do CMS + draft mode):
 * deixa claro que o conteúdo é o rascunho, não o site publicado.
 */
export function PreviewBar() {
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-950/90 py-2 pr-2 pl-4 text-[13px] text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md"
    >
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-400" />
        Pré-visualização do rascunho
      </span>
      <a href="/api/cms/preview/exit" className="rounded-full bg-white/10 px-3 py-1 whitespace-nowrap transition-colors hover:bg-white/20">
        Sair
      </a>
    </div>
  );
}
