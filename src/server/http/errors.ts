import "server-only";
import type { z } from "zod";

/** Erro com semântica HTTP. A mensagem é sempre segura para mostrar ao usuário. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** `details`: dados extras seguros para o cliente (por exemplo, onde uma imagem está em uso). */
    public readonly extra?: { fields?: Record<string, string>; retryAfter?: number; details?: unknown },
  ) {
    super(message);
  }
}

export const badRequest = (message = "Requisição inválida.") => new HttpError(400, "bad_request", message);
export const unauthorized = (message = "Faça login para continuar.") => new HttpError(401, "unauthorized", message);
export const forbidden = (message = "Você não tem permissão para esta ação.") => new HttpError(403, "forbidden", message);
export const notFound = (message = "Não encontrado.") => new HttpError(404, "not_found", message);
export const conflict = (message: string, code = "conflict") => new HttpError(409, code, message);
export const payloadTooLarge = (message = "O conteúdo enviado é grande demais.") =>
  new HttpError(413, "payload_too_large", message);
export const unsupportedMediaType = (message = "Formato não suportado.") =>
  new HttpError(415, "unsupported_media_type", message);
export const tooManyRequests = (retryAfter: number) =>
  new HttpError(429, "too_many_requests", "Muitas tentativas. Aguarde um pouco e tente novamente.", { retryAfter });

/** 422 com a mensagem de cada campo, no formato que os formulários do CMS entendem. */
export function unprocessable(issues: z.core.$ZodIssue[] | { path: PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".") || "_";
    fields[path] ??= issue.message;
  }
  return new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields });
}
