import { NextResponse } from "next/server";
import { normalizeContact, validateContact } from "@/lib/contact";

/**
 * Recebe o formulário de contato e encaminha para CONTACT_WEBHOOK_URL
 * (Make, Zapier, n8n, Slack, CRM ou serviço de e-mail).
 *
 * CONFIRMAR: enquanto a variável não estiver configurada, a rota responde 503
 * e o formulário orienta o visitante a usar os canais diretos. Nenhum lead é descartado em silêncio.
 */
export async function POST(request: Request) {
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

  const data = normalizeContact(body);
  const errors = validateContact(data);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "validation", errors }, { status: 422 });
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) {
    console.warn("[contact] CONTACT_WEBHOOK_URL não configurada. Mensagem não encaminhada.");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, source: "landing", receivedAt: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`Webhook respondeu ${response.status}`);
  } catch (error) {
    console.error("[contact] Falha ao encaminhar mensagem", error);
    return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
