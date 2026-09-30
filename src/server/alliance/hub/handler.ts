import "server-only";
import { assertSameOrigin, wrap, type Ctx } from "@/server/http/handler";
import { forbidden, unauthorized } from "@/server/http/errors";
import { enforce, POLICIES, type Policy } from "@/server/security/rate-limit";
import { hubCan, type HubPermission } from "@/lib/alliance/constants";
import { getHubSession, type HubSession, type HubUser } from "./session";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type HubCtx<Params> = Ctx<Params> & { user: HubUser; session: HubSession };

/**
 * Rotas do Alliance Hub, na mesma ordem das do CMS: CSRF (mesma origem) → sessão do Hub → permissão
 * do papel na empresa → rate limit por pessoa → erros em JSON. A empresa vem sempre da sessão, nunca
 * do corpo da requisição: é daí que sai o isolamento entre empresas.
 */
export function hubRoute<Params = Record<string, string>>(
  options: { permission?: HubPermission; rateLimit?: Policy | false },
  handler: (ctx: HubCtx<Params>) => Promise<Response>,
) {
  return wrap<Params>(async (ctx) => {
    const mutating = MUTATING.has(ctx.request.method);
    if (mutating) assertSameOrigin(ctx.request);
    const session = await getHubSession();
    if (!session) throw unauthorized("Entre no Alliance Hub para continuar.");
    if (options.permission && !hubCan(session.user.role, options.permission, { managersInvite: session.user.partner.managersInvite })) throw forbidden();
    if (options.rateLimit !== false) await enforce(options.rateLimit ?? (mutating ? POLICIES.hubMutationByUser : POLICIES.hubReadByUser), session.user.id);
    return handler({ ...ctx, user: session.user, session });
  });
}
