import { NextResponse } from "next/server";
import { diagnosticSchema } from "@/lib/diagnostic";
import { clientIpFrom } from "@/server/auth/session";
import { receiveDiagnostic } from "@/server/diagnostics/service";
import { log } from "@/server/log";
import { consume, POLICIES } from "@/server/security/rate-limit";

/**
 * Recebe o diagnóstico (o quiz de 7 perguntas do site) e guarda no banco, avisando a equipe.
 * Respostas: 200 { ok }, 400 JSON inválido, 422 validação, 429 limite por IP, 503 nenhum destino.
 */
export async function POST(request: Request) {
  const limit = await consume(POLICIES.diagnosticByIp, clientIpFrom(request.headers) ?? "unknown");
  if (!limit.allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Campo invisível para bots. Pessoas não o preenchem.
  if (typeof body === "object" && body !== null && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true });
  }

  const parsed = diagnosticSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] }, { status: 422 });
  }

  try {
    const { stored, notified, id, token } = await receiveDiagnostic(parsed.data);
    if (!stored && !notified) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    // id e token permitem agendar a call (e registrar a preferência de contato) por este diagnóstico.
    return NextResponse.json({ ok: true, id, token });
  } catch (error) {
    log.error("diagnostic.failed", { error });
    return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  }
}
