import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { authedRoute } from "@/server/http/handler";
import { exchangeCode, publicOrigin, STATE_COOKIE } from "@/server/calendar/google";
import { saveConnection } from "@/server/calendar/bookings";
import { log } from "@/server/log";

/** GET /api/cms/google/callback: volta do Google; guarda a conexão e retorna para a Agenda. */
export const GET = authedRoute({ permission: "settings.edit" }, async ({ request, user, ip, userAgent }) => {
  const url = new URL(request.url);
  const back = (result: string) => {
    const response = NextResponse.redirect(new URL(`/cms/agenda?google=${result}`, publicOrigin(request.headers, request.url)));
    response.cookies.delete({ name: STATE_COOKIE, path: "/api/cms/google" });
    return response;
  };
  const expected = request.cookies.get(STATE_COOKIE)?.value ?? "";
  const state = url.searchParams.get("state") ?? "";
  const valid = expected.length > 0 && expected.length === state.length && timingSafeEqual(Buffer.from(expected), Buffer.from(state));
  if (!valid) return back("erro");
  if (url.searchParams.get("error")) return back("cancelado");
  const code = url.searchParams.get("code");
  if (!code) return back("erro");
  try {
    const { email, refreshToken } = await exchangeCode(code, publicOrigin(request.headers, request.url));
    await saveConnection(user, { email, refreshToken }, { ip, userAgent });
    return back("conectado");
  } catch (error) {
    log.error("calendar.connect_failed", { error });
    return back("erro");
  }
});
