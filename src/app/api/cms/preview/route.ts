import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { canPreview, isPreviewPath } from "@/server/content/access";
import { authedRoute } from "@/server/http/handler";
import { badRequest, forbidden } from "@/server/http/errors";
import { POLICIES } from "@/server/security/rate-limit";

/**
 * GET /api/cms/preview?path=/: ativa o modo de pré-visualização e abre a página.
 * O cookie de draft mode sozinho não mostra nada: a página confere a sessão e a permissão.
 */
export const GET = authedRoute(
  { permission: true, rateLimit: { policy: POLICIES.previewByUser, by: "user" } },
  async ({ request, user }) => {
    if (!canPreview(user.permissions)) throw forbidden();
    const path = request.nextUrl.searchParams.get("path") ?? "/";
    if (!isPreviewPath(path)) throw badRequest("Caminho de pré-visualização inválido.");
    (await draftMode()).enable();
    return NextResponse.redirect(new URL(path, request.nextUrl.origin));
  },
);
