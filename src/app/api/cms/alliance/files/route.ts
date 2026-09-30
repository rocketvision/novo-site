import { authedRoute, json } from "@/server/http/handler";
import { forbidden } from "@/server/http/errors";
import { POLICIES } from "@/server/security/rate-limit";
import { readAllianceUpload, uploadAllianceFile } from "@/server/alliance/files";

/** POST /api/cms/alliance/files (multipart): arquivo privado para materiais e contratos. */
export const POST = authedRoute({ permission: true, rateLimit: { policy: POLICIES.uploadByUser, by: "user" } }, async ({ request, user, ip, userAgent }) => {
  if (!user.permissions.has("alliance.resources") && !user.permissions.has("alliance.contracts")) throw forbidden();
  const upload = await readAllianceUpload(request);
  const file = await uploadAllianceFile(user, upload, { ip, userAgent });
  return json({ id: file.id, filename: file.filename, sizeBytes: file.sizeBytes, mimeType: file.mimeType }, 201);
});
