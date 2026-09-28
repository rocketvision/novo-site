/**
 * Link do CMS para o site público. Quando o CMS tem endereço próprio, o site fica em outro domínio;
 * sem NEXT_PUBLIC_SITE_URL (deploys de teste, desenvolvimento), o link é relativo ao endereço atual.
 */
export function siteHref(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  return base ? `${new URL(base).origin}${path}` : path;
}
