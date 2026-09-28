import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/cms/preview/exit: desliga a pré-visualização e volta para a mesma página, agora publicada.
 * Não exige sessão: sair do modo de rascunho nunca expõe nada.
 */
export async function GET(request: NextRequest) {
  (await draftMode()).disable();
  let path = "/";
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.origin === request.nextUrl.origin && !url.pathname.startsWith("/cms")) path = url.pathname;
    } catch {
      // Referer inválido: volta para a página inicial.
    }
  }
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
