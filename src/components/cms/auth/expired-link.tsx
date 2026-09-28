import Link from "next/link";

export function ExpiredLink({ kind }: { kind: "invite" | "reset" }) {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold tracking-tight">Link expirado</h1>
      <p className="text-[13px] text-zinc-600">
        {kind === "invite"
          ? "Este convite expirou ou já foi usado. Peça um novo convite para quem administra o CMS."
          : "Este link expirou ou já foi usado. Peça um novo."}
      </p>
      <Link
        href={kind === "invite" ? "/cms/login" : "/cms/esqueci-senha"}
        className="inline-block text-[13px] text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
      >
        {kind === "invite" ? "Ir para o login" : "Pedir novo link"}
      </Link>
    </div>
  );
}
