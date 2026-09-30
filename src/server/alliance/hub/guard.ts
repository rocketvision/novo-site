import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { hubCan, type HubPermission } from "@/lib/alliance/constants";
import { getHubSession, type HubSession } from "./session";

/** Guardas das páginas do Hub (Server Components). A proteção real é sempre esta, no servidor. */
export async function requireHubSession(): Promise<HubSession> {
  const session = await getHubSession();
  if (!session) {
    const path = (await headers()).get("x-hub-path");
    const next = path && isSafeHubPath(path) ? `?next=${encodeURIComponent(path)}` : "";
    redirect(`/alliance/login${next}`);
  }
  return session;
}

export async function requireHubPermission(permission: HubPermission) {
  const session = await requireHubSession();
  if (!hubCan(session.user.role, permission, { managersInvite: session.user.partner.managersInvite })) forbidden();
  return session;
}

/** Só caminhos internos do Hub como destino depois do login (sem open redirect). */
export function isSafeHubPath(path: string) {
  return /^\/alliance(\/[\w\-./%]*)?(\?[\w\-=&%.]*)?$/.test(path) && !path.includes("//") && !path.includes("\\");
}
