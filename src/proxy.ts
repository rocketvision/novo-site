import { NextResponse, type NextRequest } from "next/server";

/**
 * 1. Endereços separados (opcional): com CMS_URL definido e diferente do site, o CMS só abre
 *    no endereço dele e o site público no dele. Sem CMS_URL, tudo fica no mesmo endereço.
 *    O mesmo vale para o Alliance Hub com ALLIANCE_URL: /alliance só abre no endereço dele, a raiz
 *    leva ao Hub e o resto (site e CMS) volta para o endereço de origem.
 * 2. Checagem otimista do CMS: quem não tem nem o cookie de sessão vai direto para o login,
 *    sem renderizar a página. A validação real da sessão e das permissões acontece no servidor,
 *    em cada layout, página e rota de API.
 */
const PUBLIC_CMS_PATHS = [/^\/cms\/login$/, /^\/cms\/esqueci-senha$/, /^\/cms\/redefinir-senha\/[^/]+$/, /^\/cms\/convite\/[^/]+$/];
const SESSION_COOKIES = ["__Host-rv_session", "rv_session"];
/** Alliance Hub: portal dos parceiros, com sessão própria (independente do CMS). */
const PUBLIC_HUB_PATHS = [/^\/alliance\/login$/, /^\/alliance\/esqueci-senha$/, /^\/alliance\/redefinir-senha\/[^/]+$/, /^\/alliance\/convite\/[^/]+$/, /^\/alliance\/confirmar-email\/[^/]+$/];
const HUB_COOKIES = ["__Host-rv_partner", "rv_partner"];
/** Cookie do modo de rascunho do Next: a pré-visualização abre páginas do site no endereço do CMS. */
const DRAFT_COOKIE = "__prerender_bypass";

function urlOf(value: string | undefined) {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
}

const siteUrl = urlOf(process.env.NEXT_PUBLIC_SITE_URL);
const cmsUrl = urlOf(process.env.CMS_URL);
const splitHosts = siteUrl && cmsUrl && siteUrl.host !== cmsUrl.host ? { site: siteUrl, cms: cmsUrl } : null;
const allianceUrl = urlOf(process.env.ALLIANCE_URL);
const hubHost = siteUrl && allianceUrl && siteUrl.host !== allianceUrl.host ? allianceUrl : null;

const isCmsPath = (pathname: string) => pathname === "/cms" || pathname.startsWith("/cms/");
const isHubPath = (pathname: string) => pathname === "/alliance" || pathname.startsWith("/alliance/");

function redirectTo(base: URL, request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(pathname + search, base.origin), 308);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (hubHost && siteUrl) {
    const onHubHost = request.headers.get("host") === hubHost.host;
    if (!onHubHost && isHubPath(pathname)) return redirectTo(hubHost, request);
    if (onHubHost && !isHubPath(pathname)) {
      if (pathname === "/") return NextResponse.redirect(new URL("/alliance", hubHost.origin), 307);
      return redirectTo(isCmsPath(pathname) && splitHosts ? splitHosts.cms : siteUrl, request);
    }
  }

  if (splitHosts) {
    const host = request.headers.get("host");
    if (host === splitHosts.site.host && isCmsPath(pathname)) return redirectTo(splitHosts.cms, request);
    if (host === splitHosts.cms.host && !isCmsPath(pathname)) {
      // A raiz do endereço do CMS é o painel, exceto durante a pré-visualização do rascunho.
      if (pathname === "/" && !request.cookies.has(DRAFT_COOKIE)) {
        return NextResponse.redirect(new URL("/cms", splitHosts.cms.origin), 307);
      }
      // Demais páginas do site abertas no endereço do CMS (pré-visualização) nunca são indexadas.
      const response = NextResponse.next();
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }
  }

  if (isHubPath(pathname)) return hub(request);
  if (!isCmsPath(pathname)) return NextResponse.next();
  if (PUBLIC_CMS_PATHS.some((re) => re.test(pathname))) return NextResponse.next();

  const hasCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/cms/login";
    url.search = pathname === "/cms" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Caminho pedido, para o layout do CMS devolver a pessoa a esta página depois do login
  // caso a sessão tenha expirado. Sempre sobrescrito aqui; o valor enviado pelo cliente é ignorado.
  const headers = new Headers(request.headers);
  headers.set("x-cms-path", pathname + search);
  return NextResponse.next({ request: { headers } });
}

/** Mesma checagem otimista do CMS, para o Hub: sem cookie, direto ao login do Hub. O Hub nunca é indexado. */
function hub(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let response: NextResponse;
  if (PUBLIC_HUB_PATHS.some((re) => re.test(pathname))) {
    response = NextResponse.next();
  } else if (!HUB_COOKIES.some((name) => request.cookies.has(name))) {
    const url = request.nextUrl.clone();
    url.pathname = "/alliance/login";
    url.search = pathname === "/alliance" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    response = NextResponse.redirect(url);
  } else {
    const headers = new Headers(request.headers);
    headers.set("x-hub-path", pathname + search);
    response = NextResponse.next({ request: { headers } });
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Páginas (site e CMS). Ficam de fora a API, os arquivos do Next e arquivos estáticos com extensão.
  matcher: ["/((?!api/|_next/|_vercel/|.*\\.[a-zA-Z0-9]+$).*)"],
};
