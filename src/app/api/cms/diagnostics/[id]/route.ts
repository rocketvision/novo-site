import { z } from "zod";
import { diagnosticUpdateSchema } from "@/lib/diagnostic";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { deleteDiagnostic, updateDiagnostic } from "@/server/diagnostics/service";

const isId = (id: string) => z.string().uuid().safeParse(id).success;

/** PATCH /api/cms/diagnostics/:id: muda a etapa e/ou as anotações. */
export const PATCH = authedRoute<{ id: string }>({ permission: "diagnostics.manage" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isId(params.id)) throw notFound("Diagnóstico não encontrado.");
  const input = await readJson(request, diagnosticUpdateSchema);
  const updated = await updateDiagnostic(user, params.id, input, { ip, userAgent });
  return json({ status: updated.status, notes: updated.notes, updatedAt: updated.updatedAt });
});

/** DELETE /api/cms/diagnostics/:id: exclui o diagnóstico (fica o registro na auditoria). */
export const DELETE = authedRoute<{ id: string }>({ permission: "diagnostics.delete" }, async ({ params, user, ip, userAgent }) => {
  if (!isId(params.id)) throw notFound("Diagnóstico não encontrado.");
  await deleteDiagnostic(user, params.id, { ip, userAgent });
  return json({ ok: true });
});
