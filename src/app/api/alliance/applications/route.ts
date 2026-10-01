import { z } from "zod";
import { applicationSchema } from "@/lib/alliance/validation";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { submitApplication } from "@/server/alliance/applications";
import { enforce, POLICIES } from "@/server/security/rate-limit";

/** Honeypot: campo invisível do formulário. Pessoas não o preenchem; robôs, sim. */
const withHoneypot = applicationSchema.extend({ fax: z.string().max(200).optional() });

/**
 * POST /api/alliance/applications: candidatura ao Rocket Alliance.
 *
 * Proteções: mesma origem (CSRF), JSON de até 12 KB, validação estrita no servidor, campo invisível
 * contra robôs, limite por IP e teto geral por hora. Entra como Pending Review, sem criar acesso ao Hub.
 * A resposta é a mesma para uma candidatura nova ou repetida (não revela e-mails já cadastrados).
 */
export const POST = publicRoute({ rateLimit: { policy: POLICIES.applicationByIp, by: "ip" } }, async ({ request, ip, userAgent }) => {
  await enforce(POLICIES.applicationGlobal, "all");
  const { fax, ...data } = await readJson(request, withHoneypot, 12 * 1024);
  if (fax) return json({ ok: true });
  await submitApplication(data, { ip, userAgent });
  return json({ ok: true });
});
