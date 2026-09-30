import { Sidebar, type NavKey } from "@/components/cms/shell/sidebar";
import { isBlogOnly, requireUser } from "@/server/authz/guard";
import type { Permission } from "@/server/authz/permissions";

/** Layout autenticado do CMS. Toda página abaixo exige sessão válida (verificada no servidor). */
export default async function CmsAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const gates: [NavKey, Permission | null][] = [
    // A visão geral é das áreas administrativas: o Colunista vê só o Blog e a própria conta.
    ...(isBlogOnly(user.permissions) ? [] : [["dashboard", null] as [NavKey, null]]),
    ["blog", "blog.view"],
    ["landing", "landing.view"],
    ["projects", "projects.view"],
    ["diagnostics", "diagnostics.view"],
    ["agenda", "diagnostics.view"],
    ["media", "media.view"],
    ["users", "users.view"],
    ["audit", "audit.view"],
    ["settings", "settings.view"],
  ];
  const allowed = gates.filter(([, p]) => p === null || user.permissions.has(p)).map(([k]) => k);

  return (
    <div className="lg:pl-60">
      <Sidebar allowed={allowed} user={{ name: user.name, email: user.email, roleName: user.roleName }} />
      <main id="conteudo" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
