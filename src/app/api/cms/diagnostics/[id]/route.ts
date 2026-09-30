import { z } from "zod";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { setDiagnosticHandled } from "@/server/diagnostics/service";

const bodySchema = z.object({ handled: z.boolean() });

/** PATCH /api/cms/diagnostics/:id: marca (ou desmarca) o diagnóstico como respondido. */
export const PATCH = authedRoute<{ id: string }>({ permission: "audit.view" }, async ({ params, request }) => {
  const { handled } = await readJson(request, bodySchema);
  if (!z.string().uuid().safeParse(params.id).success) return json({ error: { code: "not_found", message: "Diagnóstico não encontrado." } }, 404);
  await setDiagnosticHandled(params.id, handled);
  return json({ ok: true });
});
