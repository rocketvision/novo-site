import { timingSafeEqual } from "node:crypto";
import { publishDueArticles } from "@/server/blog/service";
import { env } from "@/server/env";
import { json, publicRoute } from "@/server/http/handler";
import { unauthorized } from "@/server/http/errors";
import { POLICIES } from "@/server/security/rate-limit";

/**
 * GET /api/cron/blog-publish: publica os artigos agendados que já venceram.
 * Chamada pelo Cron da Vercel com "Authorization: Bearer <CRON_SECRET>". Sem o segredo configurado, recusa tudo.
 * As páginas do Blog também fazem essa verificação ao serem visitadas, então o cron é só uma das garantias.
 */
function authorized(header: string | null) {
  if (!env.CRON_SECRET || !header) return false;
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export const GET = publicRoute({ rateLimit: { policy: POLICIES.cronByIp, by: "ip" } }, async ({ request }) => {
  if (!authorized(request.headers.get("authorization"))) throw unauthorized("Não autorizado.");
  const result = await publishDueArticles();
  return json({ published: result.published.length, failed: result.failed.length });
});
