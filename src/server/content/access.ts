import "server-only";
import { isSectionKey, type SectionKey } from "@/lib/content/schemas";
import { sectionByKey } from "@/lib/content/sections";
import type { SessionUser } from "@/server/auth/session";
import { forbidden, notFound } from "@/server/http/errors";

/** Seções da landing exigem permissões de landing; a seção "site" exige as de configurações. */
export function assertSectionPermission(user: SessionUser, key: string, action: "view" | "edit" | "publish"): asserts key is SectionKey {
  if (!isSectionKey(key)) throw notFound("Seção não encontrada.");
  const area = sectionByKey(key).area === "settings" ? "settings" : "landing";
  if (!user.permissions.has(`${area}.${action}`)) throw forbidden();
}

/** Só páginas do site público podem ser pré-visualizadas (sem URLs externas nem o próprio CMS). */
export function isPreviewPath(path: string) {
  return /^\/(?!\/)[^\\]*$/.test(path) && !path.startsWith("/cms") && !path.startsWith("/api") && path.length <= 300;
}

/** Quem vê a landing ou as configurações pode pré-visualizar o site com os rascunhos. */
export function canPreview(permissions: ReadonlySet<string>) {
  return permissions.has("landing.view") || permissions.has("settings.view");
}
