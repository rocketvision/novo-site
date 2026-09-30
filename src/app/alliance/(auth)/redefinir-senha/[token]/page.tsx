import type { Metadata } from "next";
import { ExpiredHubLink, HubSetPasswordForm } from "@/components/hub/auth-forms";
import { peekHubToken } from "@/server/alliance/hub/auth";

export const metadata: Metadata = { title: "Nova senha", referrer: "no-referrer" };

export default async function HubResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await peekHubToken(token, "password_reset");
  return info ? <HubSetPasswordForm token={token} mode="reset" name={info.name} company={info.company} /> : <ExpiredHubLink />;
}
