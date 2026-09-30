import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HubLoginForm } from "@/components/hub/auth-forms";
import { isSafeHubPath } from "@/server/alliance/hub/guard";
import { getHubSession } from "@/server/alliance/hub/session";

export const metadata: Metadata = { title: "Entrar" };

export default async function HubLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = sp.next && isSafeHubPath(sp.next) ? sp.next : undefined;
  if (await getHubSession().catch(() => null)) redirect(next ?? "/alliance");
  return <HubLoginForm next={next} notice={sp.senha ? "Senha alterada. Entre com a nova senha." : undefined} />;
}
