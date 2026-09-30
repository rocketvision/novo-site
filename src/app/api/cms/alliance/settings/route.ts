import { z } from "zod";
import { programSettingsSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { updateProgramSettings } from "@/server/alliance/settings";

/** PUT /api/cms/alliance/settings: parâmetros operacionais do programa. */
export const PUT = authedRoute({ permission: "alliance.settings" }, async ({ request, user, ip, userAgent }) => {
  const { data, version } = await readJson(request, z.object({ data: programSettingsSchema, version: z.number().int().min(0) }));
  return json(await updateProgramSettings(user, data, version, { ip, userAgent }));
});
