import { Sidebar } from "@/components/cms/shell/sidebar";
import type { NavItem, NavSection } from "@/components/cms/shell/nav";
import { isBlogOnly, requireUser } from "@/server/authz/guard";
import type { Permission } from "@/server/authz/permissions";
import { allianceBadges } from "@/server/alliance/overview";

/** Layout autenticado do CMS. Toda página abaixo exige sessão válida (verificada no servidor). */
export default async function CmsAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const can = (p: Permission) => user.permissions.has(p);
  const badges = can("alliance.view") ? await allianceBadges() : null;

  // Itens sem permissão nem chegam ao navegador. Cada página e rota confere de novo no servidor.
  const only = <T,>(cond: boolean, value: T) => (cond ? [value] : []);
  const sections: NavSection[] = [
    {
      title: null,
      // A visão geral é das áreas administrativas: o Colunista vê só o Blog e a própria conta.
      items: only<NavItem>(!isBlogOnly(user.permissions), { href: "/cms", label: "Visão geral", icon: "dashboard", exact: true }),
    },
    {
      title: "Site",
      items: [
        ...only<NavItem>(can("landing.view"), { href: "/cms/landing", label: "Landing page", icon: "landing" }),
        ...only<NavItem>(can("blog.view"), {
          href: "/cms/blog",
          label: "Blog",
          icon: "blog",
          children: [
            { href: "/cms/blog", label: "Artigos", exclude: ["/cms/blog/categorias", "/cms/blog/autores", "/cms/blog/perfil"] },
            ...only(can("blog.categories"), { href: "/cms/blog/categorias", label: "Categorias" }),
            ...only(can("blog.authors"), { href: "/cms/blog/autores", label: "Autores" }),
            ...only(can("blog.create"), { href: "/cms/blog/perfil", label: "Meu perfil de autor" }),
          ],
        }),
        ...only<NavItem>(can("projects.view"), { href: "/cms/projetos", label: "Projetos", icon: "projects" }),
      ],
    },
    {
      title: "Comercial",
      items: [
        ...only<NavItem>(can("diagnostics.view"), { href: "/cms/diagnosticos", label: "Diagnósticos", icon: "diagnostics" }),
        ...only<NavItem>(can("diagnostics.view"), { href: "/cms/agenda", label: "Agenda", icon: "agenda" }),
        ...only<NavItem>(can("alliance.view"), {
          href: "/cms/alliance",
          label: "Rocket Alliance",
          icon: "alliance",
          badge: badges ? badges.applications + badges.referrals + badges.changeRequests + (can("alliance.communications") ? badges.tickets : 0) : undefined,
          children: [
            { group: "Operação", href: "/cms/alliance", label: "Visão geral", exact: true },
            ...only(can("alliance.applications"), { href: "/cms/alliance/candidaturas", label: "Candidaturas", badge: badges?.applications }),
            { href: "/cms/alliance/parceiros", label: "Parceiros", badge: badges?.changeRequests },
            { href: "/cms/alliance/indicacoes", label: "Indicações", badge: badges?.referrals },
            ...only(can("alliance.finance"), { href: "/cms/alliance/comissoes", label: "Comissões" }),
            ...only(can("alliance.communications"), { href: "/cms/alliance/comunicacoes/suporte", label: "Suporte", badge: badges?.tickets }),
            ...only(can("alliance.publish"), { group: "Conteúdo", href: "/cms/alliance/diretorio", label: "Diretório" }),
            ...only(can("alliance.publish"), { href: "/cms/alliance/paginas", label: "Páginas" }),
            ...only(can("alliance.resources"), { href: "/cms/alliance/recursos", label: "Recursos" }),
            ...only(can("alliance.communications"), { href: "/cms/alliance/comunicacoes", label: "Comunicados", exclude: ["/cms/alliance/comunicacoes/suporte"] }),
            ...only(can("alliance.contracts"), { group: "Administração", href: "/cms/alliance/contratos", label: "Contratos" }),
            ...only(can("alliance.settings"), { href: "/cms/alliance/configuracoes", label: "Configurações" }),
          ],
        }),
      ],
    },
    {
      title: "Sistema",
      items: [
        ...only<NavItem>(can("media.view"), { href: "/cms/midia", label: "Mídia", icon: "media" }),
        ...only<NavItem>(can("users.view"), {
          href: "/cms/usuarios",
          label: "Usuários",
          icon: "users",
          children: [
            { href: "/cms/usuarios", label: "Pessoas", exclude: ["/cms/usuarios/funcoes"] },
            { href: "/cms/usuarios/funcoes", label: "Funções e permissões" },
          ],
        }),
        ...only<NavItem>(can("audit.view"), { href: "/cms/auditoria", label: "Auditoria", icon: "audit" }),
        ...only<NavItem>(can("settings.view"), { href: "/cms/configuracoes", label: "Configurações", icon: "settings" }),
      ],
    },
  ];

  return (
    <div className="lg:pl-64">
      <Sidebar sections={sections.filter((s) => s.items.length > 0)} user={{ name: user.name, email: user.email, roleName: user.roleName }} />
      <main id="conteudo" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
