import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authedRoute } from "@/server/http/handler";
import { HttpError } from "@/server/http/errors";
import { consentUrl, isCalendarConfigured, publicOrigin, STATE_COOKIE } from "@/server/calendar/google";
import { isProduction } from "@/server/env";



/** GET /api/cms/google/connect: leva ao consentimento do Google para conectar a agenda das calls. */
export const GET = authedRoute({ permission: "settings.edit" }, async ({ request }) => {
  if (!isCalendarConfigured()) throw new HttpError(503, "calendar_not_configured", "Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET na Vercel.");
  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(consentUrl(state, publicOrigin(request.headers, request.url)));
  response.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/api/cms/google", maxAge: 600 });
  return response;
});
