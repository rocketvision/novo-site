import { reorderProjectsSchema } from "@/lib/validation/projects";
import { authedRoute, noContent, readJson } from "@/server/http/handler";
import { reorderProjects } from "@/server/projects/service";

/** POST /api/cms/projects/reorder: nova ordem da vitrine (lista completa de ids). */
export const POST = authedRoute({ permission: "projects.edit" }, async ({ request, user, ip, userAgent }) => {
  const { ids } = await readJson(request, reorderProjectsSchema, 32 * 1024);
  await reorderProjects({ id: user.id, email: user.email }, ids, { ip, userAgent });
  return noContent();
});
