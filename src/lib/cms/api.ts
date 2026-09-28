/**
 * Cliente das rotas /api/cms usado pelos formulários do CMS.
 * Converte respostas de erro em ApiError com a mensagem e os erros por campo do servidor.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; formData?: FormData } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? (init.body || init.formData ? "POST" : "GET"),
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.formData ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "network", "Sem conexão. Verifique a internet e tente de novo.");
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "unknown",
      error?.message ?? (response.status === 413 ? "O arquivo é grande demais." : "Algo deu errado. Tente novamente."),
      error?.fields ?? {},
      error?.details,
    );
  }
  return data as T;
}
