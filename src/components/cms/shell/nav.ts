/**
 * Navegação do Studio: uma árvore só, montada no servidor (já filtrada pelas permissões da pessoa)
 * e desenhada pelo menu lateral. Cada área tem os seus subitens ali, então as páginas não repetem
 * abas de seção no topo.
 */

export type NavIcon =
  | "dashboard"
  | "landing"
  | "blog"
  | "projects"
  | "diagnostics"
  | "agenda"
  | "alliance"
  | "media"
  | "users"
  | "audit"
  | "settings";

export type NavLeaf = {
  href: string;
  label: string;
  badge?: number;
  /** Subtítulo de grupo exibido antes deste item (ex.: "Operação"). */
  group?: string;
  /** Só ativo no endereço exato (ex.: a visão geral de uma área). */
  exact?: boolean;
  /** Caminhos que começam com `href` mas pertencem a outro item. */
  exclude?: string[];
};

export type NavItem = NavLeaf & { icon: NavIcon; children?: NavLeaf[] };
export type NavSection = { title: string | null; items: NavItem[] };

export function isActivePath(pathname: string, item: Pick<NavLeaf, "href" | "exact" | "exclude">) {
  if (item.exclude?.some((x) => pathname === x || pathname.startsWith(`${x}/`))) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
