import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function CmsForbidden() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <ShieldOff aria-hidden="true" className="size-6 text-zinc-400" />
      <h1 className="mt-4 text-base font-semibold">Sem permissão</h1>
      <p className="mt-1 text-sm text-zinc-500">Sua função não dá acesso a esta área.</p>
      <Link href="/cms" className="mt-5 text-[13px] text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
        Voltar para a visão geral
      </Link>
    </div>
  );
}
