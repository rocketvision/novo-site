import { json } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { uploadMedia } from "@/server/media/service";
import { readImageUpload } from "@/server/media/upload";
import { POLICIES } from "@/server/security/rate-limit";

/**
 * POST /api/alliance/hub/company/logo (multipart): envia um logotipo novo. A imagem passa pela mesma
 * validação da biblioteca (tipo pelos bytes, sem SVG, reprocessada) e só é usada se a Rocket aprovar o pedido.
 */
export const POST = hubRoute({ permission: "company.edit", rateLimit: POLICIES.uploadByUser }, async ({ request, user, ip, userAgent }) => {
  const upload = await readImageUpload(request);
  const result = await uploadMedia({ id: null, email: user.email }, { buffer: upload.buffer, filename: upload.filename, alt: `Logotipo ${user.partner.tradeName}` }, { ip, userAgent });
  return json({ id: result.media.id, url: result.media.url }, 201);
});
