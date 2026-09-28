import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/cms/auth/login-form";
import { getSession } from "@/server/auth/session";
import { isSafeInternalPath } from "@/server/authz/guard";

export const metadata: Metadata = { title: "Entrar" };

const NOTICES: Record<string, string> = {
  "senha=redefinida": "Senha redefinida. Entre com a nova senha.",
  "convite=aceito": "Conta ativada. Entre com a senha que você criou.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const next = params.next && isSafeInternalPath(params.next) ? params.next : undefined;
  if (await getSession()) redirect(next ?? "/cms");

  const notice = params.senha === "redefinida" ? NOTICES["senha=redefinida"] : params.convite === "aceito" ? NOTICES["convite=aceito"] : undefined;
  return <LoginForm next={next} notice={notice} />;
}
