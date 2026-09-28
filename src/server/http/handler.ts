import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { getSession, clientIpFrom, type SessionUser, type ValidSession } from "@/server/auth/session";
import { DatabaseNotConfiguredError } from "@/server/db";
import type { Permission } from "@/server/authz/permissions";
import { enforce, POLICIES, type Policy } from "@/server/security/rate-limit";
import { log } from "@/server/log";
import { cmsOrigin, env } from "@/server/env";
import { HttpError, badRequest, forbidden, payloadTooLarge, unauthorized, unprocessable, unsupportedMediaType } from "./errors";

/**
 * Wrapper único das rotas de API do CMS. Toda rota passa por aqui, na mesma ordem:
 *
 * 1. CSRF: mutações só são aceitas vindas da própria origem (Origin / Sec-Fetch-Site).
 * 2. Autenticação: sessão válida, quando exigida.
 * 3. Autorização: permissão verificada no servidor.
 * 4. Rate limit: por usuário ou por IP, conforme a política.
 * 5. Erros: convertidos em JSON com status HTTP correto; nada interno vaza para o cliente.
 */

type Ctx<Params> = {
  request: NextRequest;
  params: Params;
  ip: string | null;
  userAgent: string | null;
  requestId: string;
};

type AuthedCtx<Params> = Ctx<Params> & { user: SessionUser; session: ValidSession };

type Options = {
  /** Permissão exigida. `true` exige só estar logado. */
  permission?: Permission | true;
  /** Política de rate limit. Por padrão: leitura/mutação por usuário, conforme o método. */
  rateLimit?: { policy: Policy; by: "user" | "ip" } | false;
};

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function publicRoute<Params = Record<string, string>>(
  options: { rateLimit?: { policy: Policy; by: "ip" } },
  handler: (ctx: Ctx<Params>) => Promise<Response>,
) {
  return wrap<Params>(async (ctx) => {
    if (MUTATING.has(ctx.request.method)) assertSameOrigin(ctx.request);
    if (options.rateLimit) await enforce(options.rateLimit.policy, ctx.ip ?? "unknown");
    return handler(ctx);
  });
}

export function authedRoute<Params = Record<string, string>>(
  options: Options,
  handler: (ctx: AuthedCtx<Params>) => Promise<Response>,
) {
  return wrap<Params>(async (ctx) => {
    const mutating = MUTATING.has(ctx.request.method);
    if (mutating) assertSameOrigin(ctx.request);

    const session = await getSession();
    if (!session) throw unauthorized();
    if (options.permission && options.permission !== true && !session.user.permissions.has(options.permission)) {
      throw forbidden();
    }

    if (options.rateLimit !== false) {
      const rl = options.rateLimit ?? { policy: mutating ? POLICIES.mutationByUser : POLICIES.apiReadByUser, by: "user" as const };
      await enforce(rl.policy, rl.by === "user" ? session.user.id : (ctx.ip ?? "unknown"));
    }

    return handler({ ...ctx, user: session.user, session });
  });
}

function wrap<Params>(inner: (ctx: Ctx<Params>) => Promise<Response>) {
  return async (request: NextRequest, context: { params: Promise<Params> }) => {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    try {
      const response = await inner({
        request,
        params: await context.params,
        ip: clientIpFrom(request.headers),
        userAgent: request.headers.get("user-agent")?.slice(0, 256) ?? null,
        requestId,
      });
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      return toErrorResponse(error, request, requestId, started);
    }
  };
}

function toErrorResponse(error: unknown, request: NextRequest, requestId: string, started: number) {
  const route = `${request.method} ${request.nextUrl.pathname}`;
  let httpError: HttpError;
  if (error instanceof HttpError) {
    httpError = error;
    if (error.status >= 500) log.error("http.error", { requestId, route, status: error.status, error });
  } else if (error instanceof DatabaseNotConfiguredError) {
    httpError = new HttpError(503, "unavailable", "Serviço temporariamente indisponível.");
    log.error("http.db_not_configured", { requestId, route });
  } else {
    httpError = new HttpError(500, "internal_error", "Algo deu errado. Tente novamente em instantes.");
    log.error("http.unhandled", { requestId, route, ms: Date.now() - started, error });
  }

  const headers: Record<string, string> = { "X-Request-Id": requestId, "Cache-Control": "no-store" };
  if (httpError.extra?.retryAfter) headers["Retry-After"] = String(httpError.extra.retryAfter);

  return NextResponse.json(
    {
      error: {
        code: httpError.code,
        message: httpError.message,
        ...(httpError.extra?.fields && { fields: httpError.extra.fields }),
        ...(httpError.extra?.details !== undefined && { details: httpError.extra.details }),
        requestId,
      },
    },
    { status: httpError.status, headers },
  );
}

/**
 * Proteção CSRF para mutações. O cookie de sessão já é SameSite=Lax; além disso,
 * toda mutação precisa vir da mesma origem. Navegadores modernos sempre enviam Origin
 * (ou Sec-Fetch-Site) em POST/PUT/PATCH/DELETE.
 */
export function assertSameOrigin(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") throw forbidden("Origem da requisição não permitida.");

  const origin = request.headers.get("origin");
  if (!origin) {
    if (fetchSite === "same-origin") return;
    throw forbidden("Origem da requisição não permitida.");
  }
  const allowed = new Set([request.nextUrl.origin, new URL(env.NEXT_PUBLIC_SITE_URL).origin, cmsOrigin]);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  if (host) allowed.add(`${proto}://${host}`);
  if (!allowed.has(origin)) throw forbidden("Origem da requisição não permitida.");
}

/** Lê e valida um corpo JSON com limite de tamanho. Campos fora do schema são descartados (sem mass assignment). */
export async function readJson<S extends z.ZodType>(request: Request, schema: S, maxBytes = 256 * 1024): Promise<z.infer<S>> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) throw unsupportedMediaType("Envie os dados como JSON.");

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw payloadTooLarge();

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw payloadTooLarge();

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw badRequest("JSON inválido.");
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) throw unprocessable(parsed.error.issues);
  return parsed.data;
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const noContent = () => new NextResponse(null, { status: 204 });
