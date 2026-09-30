import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { getSession, type SessionUser, type ValidSession } from "@/server/auth/session";
import type { Permission } from "./permissions";

/**
 * Guardas para Server Components (páginas do CMS).
 * A proteção real é sempre feita aqui, no servidor, a cada renderização.
 * O proxy só faz um redirecionamento otimista para quem nem tem cookie.
 */

export function can(user: SessionUser, permission: Permission) {
  return user.permissions.has(permission);
}

export function canAny(user: SessionUser, permissions: Permission[]) {
  return permissions.some((p) => user.permissions.has(p));
}

/** Áreas administrativas do Studio. Quem não tem nenhuma delas e tem o Blog (o Colunista) vive só no Blog. */
const ADMIN_AREAS: Permission[] = ["landing.view", "projects.view", "diagnostics.view", "media.view", "users.view", "audit.view", "settings.view"];

export function isBlogOnly(permissions: ReadonlySet<Permission>) {
  return permissions.has("blog.view") && !ADMIN_AREAS.some((p) => permissions.has(p));
}

/** Página inicial do Studio para a pessoa: o Colunista começa no Blog. */
export function homePathFor(permissions: ReadonlySet<Permission>) {
  return isBlogOnly(permissions) ? "/cms/blog" : "/cms";
}

/** Exige sessão válida. Sem ela, volta para o login lembrando a página pedida. */
export async function requireSession(nextPath?: string): Promise<ValidSession> {
  const session = await getSession();
  if (!session) {
    nextPath ??= (await headers()).get("x-cms-path") ?? undefined;
    const next = nextPath && isSafeInternalPath(nextPath) ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/cms/login${next}`);
  }
  return session;
}

export async function requireUser(nextPath?: string): Promise<SessionUser> {
  return (await requireSession(nextPath)).user;
}

/** Exige a permissão; sem ela, responde 403 com a página de acesso negado do CMS. */
export async function requirePermission(permission: Permission, nextPath?: string): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (!can(user, permission)) forbidden();
  return user;
}

/**
 * Só aceita caminhos internos do CMS como destino após o login (evita open redirect).
 * Recusa URLs absolutas, protocol-relative (//) e barras invertidas.
 */
export function isSafeInternalPath(path: string) {
  return /^\/cms(\/[\w\-./%]*)?(\?[\w\-=&%.]*)?$/.test(path) && !path.includes("//") && !path.includes("\\");
}
