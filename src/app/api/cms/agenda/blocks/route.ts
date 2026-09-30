import { blockSchema } from "@/lib/booking";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { createBlock } from "@/server/calendar/bookings";

/** POST /api/cms/agenda/blocks: marca um horário (ou o dia inteiro) como indisponível. */
export const POST = authedRoute({ permission: "diagnostics.manage" }, async ({ request, user, ip, userAgent }) => {
  const input = await readJson(request, blockSchema);
  const block = await createBlock(user, input, { ip, userAgent });
  return json({ id: block.id }, 201);
});
