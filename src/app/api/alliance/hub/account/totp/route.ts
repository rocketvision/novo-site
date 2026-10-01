import { totpConfirmSchema, totpDisableSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { confirmTotpSetup, disableTotp, startTotpSetup } from "@/server/alliance/hub/auth";

/** POST: começa a configurar o 2FA (devolve a chave e o URI). PUT: confirma com um código. DELETE: desativa (exige senha). */
export const POST = hubRoute({}, async ({ user }) => json(await startTotpSetup(user)));

export const PUT = hubRoute({}, async ({ request, user, ip, userAgent }) => {
  const { code } = await readJson(request, totpConfirmSchema, 1024);
  return json(await confirmTotpSetup(user, code, { ip, userAgent }));
});

export const DELETE = hubRoute({}, async ({ request, user, ip, userAgent }) => {
  const { password } = await readJson(request, totpDisableSchema, 1024);
  await disableTotp(user, password, { ip, userAgent });
  return json({ ok: true });
});
