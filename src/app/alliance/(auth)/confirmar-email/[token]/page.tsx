import type { Metadata } from "next";
import { ExpiredHubLink, HubConfirmEmail } from "@/components/hub/auth-forms";
import { peekHubToken } from "@/server/alliance/hub/auth";

export const metadata: Metadata = { title: "Confirmar e-mail", referrer: "no-referrer" };

/** A confirmação exige um clique (links abertos por antivírus e pré-visualizações de e-mail não confirmam sozinhos). */
export default async function HubConfirmEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (await peekHubToken(token, "email_change")) ? <HubConfirmEmail token={token} /> : <ExpiredHubLink />;
}
