import { ticketInputSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { createTicket } from "@/server/alliance/support";

/** POST /api/alliance/hub/support: abre um chamado com a equipe Rocket Vision. */
export const POST = hubRoute({ permission: "support.use" }, async ({ request, user, ip, userAgent }) => {
  return json(await createTicket(user, await readJson(request, ticketInputSchema, 8 * 1024), { ip, userAgent }), 201);
});
