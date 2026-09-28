import Link from "next/link";

export default function CmsNotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="font-mono text-xs text-zinc-400">404</p>
      <h1 className="mt-3 text-base font-semibold">Não encontrado</h1>
      <p className="mt-1 text-sm text-zinc-500">O item não existe ou foi removido.</p>
      <Link href="/cms" className="mt-5 text-[13px] text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
        Voltar para a visão geral
      </Link>
    </div>
  );
}
