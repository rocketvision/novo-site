import "server-only";
import { badRequest, payloadTooLarge, unsupportedMediaType } from "@/server/http/errors";
import { MAX_UPLOAD_BYTES } from "./process";

/** Margem para os cabeçalhos do multipart além do próprio arquivo. */
const MULTIPART_OVERHEAD = 64 * 1024;

/**
 * Lê um envio multipart com um único arquivo no campo `file` (e campos de texto opcionais).
 * O tamanho é conferido antes de ler o corpo e de novo depois (Content-Length pode mentir).
 */
export async function readImageUpload(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data")) throw unsupportedMediaType("Envie a imagem como multipart/form-data.");

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD) throw tooLarge();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw badRequest("Não foi possível ler o envio.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Nenhum arquivo enviado.");
  if (file.size > MAX_UPLOAD_BYTES) throw tooLarge();

  const text = (name: string, max: number) => {
    const value = form.get(name);
    return typeof value === "string" ? value.slice(0, max) : undefined;
  };

  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    filename: file.name,
    alt: text("alt", 300),
    expectedUpdatedAt: text("expectedUpdatedAt", 40),
  };
}

const tooLarge = () => payloadTooLarge(`A imagem pode ter no máximo ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
