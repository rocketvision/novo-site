import "server-only";
import { isSectionKey, type SectionKey } from "@/lib/content/schemas";
import { sectionByKey } from "@/lib/content/sections";
import type { SessionUser } from "@/server/auth/session";
import { forbidden, notFound } from "@/server/http/errors";

/**
 * Seções da landing exigem permissões de landing; a seção "site" exige as de configurações; a página
 * do Rocket Alliance exige ver o programa para ler e publicar parceiros (alliance.publish) para editar e publicar.
 */
export function assertSectionPermission(user: SessionUser, key: string, action: "view" | "edit" | "publish"): asserts key is SectionKey {
  if (!isSectionKey(key)) throw notFound("Seção não encontrada.");
  const area = sectionByKey(key).area;
  const permission = area === "alliance" ? (action === "view" ? "alliance.view" : "alliance.publish") : `${area}.${action}`;
  if (!user.permissions.has(permission as Parameters<typeof user.permissions.has>[0])) throw forbidden();
}

/** Só páginas do site público podem ser pré-visualizadas (sem URLs externas nem o próprio CMS). */
export function isPreviewPath(path: string) {
  return /^\/(?!\/)[^\\]*$/.test(path) && !path.startsWith("/cms") && !path.startsWith("/api") && path.length <= 300;
}

/** Quem vê a landing ou as configurações pode pré-visualizar o site com os rascunhos. */
export function canPreview(permissions: ReadonlySet<string>) {
  // Quem gerencia o Rocket Alliance também edita o conteúdo da página /partners e precisa pré-visualizá-lo.
  return permissions.has("landing.view") || permissions.has("settings.view") || permissions.has("alliance.view");
}

/**
 * Pré-visualização de artigos do Blog: basta acessar o Blog no Studio. A página do artigo ainda confere
 * se a pessoa pode ver aquele artigo (o Colunista só pré-visualiza os próprios).
 */
export function canPreviewPath(permissions: ReadonlySet<string>, path: string) {
  if (path === "/blog" || path.startsWith("/blog/")) return permissions.has("blog.view") || canPreview(permissions);
  // Página do programa e páginas exclusivas dos parceiros: quem vê o Rocket Alliance no Studio.
  if (path === "/partners" || path.startsWith("/partners/")) return permissions.has("alliance.view") || canPreview(permissions);
  return canPreview(permissions);
}
