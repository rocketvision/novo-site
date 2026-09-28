import { resetRequestSchema } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/server/auth/service";
import { json, publicRoute, readJson } from "@/server/http/handler";

/**
 * POST /api/cms/auth/password-reset/request: sempre 202 com a mesma mensagem,
 * exista a conta ou não (sem enumeração de usuários).
 */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  const { email } = await readJson(request, resetRequestSchema, 2 * 1024);
  await requestPasswordReset(email, { ip, userAgent });
  return json({ message: "Se houver uma conta ativa com este e-mail, enviaremos um link para redefinir a senha." }, 202);
});
