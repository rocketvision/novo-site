import type { Metadata } from "next";
import { ExpiredHubLink, HubSetPasswordForm } from "@/components/hub/auth-forms";
import { peekHubToken } from "@/server/alliance/hub/auth";

export const metadata: Metadata = { title: "Convite", referrer: "no-referrer" };

export default async function HubInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await peekHubToken(token, "invite");
  return info ? <HubSetPasswordForm token={token} mode="invite" name={info.name} company={info.company} /> : <ExpiredHubLink />;
}
