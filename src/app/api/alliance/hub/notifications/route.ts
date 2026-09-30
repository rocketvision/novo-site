import { z } from "zod";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { markNotificationsRead } from "@/server/alliance/library";

/** POST /api/alliance/hub/notifications: marca avisos como lidos (todos, sem `ids`). */
export const POST = hubRoute({}, async ({ request, user }) => {
  const { ids } = await readJson(request, z.object({ ids: z.array(z.string().uuid()).max(100).optional() }), 8 * 1024);
  await markNotificationsRead(user, ids);
  return json({ ok: true });
});
