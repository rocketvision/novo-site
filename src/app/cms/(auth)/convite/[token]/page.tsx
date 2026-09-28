import type { Metadata } from "next";
import { ExpiredLink } from "@/components/cms/auth/expired-link";
import { SetPasswordForm } from "@/components/cms/auth/set-password-form";
import { peekToken } from "@/server/auth/service";

export const metadata: Metadata = { title: "Ativar conta", referrer: "no-referrer" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await peekToken(token, "invite");
  if (!valid) return <ExpiredLink kind="invite" />;
  return (
    <SetPasswordForm
      token={token}
      endpoint="/api/cms/auth/invite/accept"
      title={`Olá, ${valid.name.split(" ")[0]}`}
      description={`Crie uma senha para ativar a conta ${valid.email}.`}
      submitLabel="Ativar conta"
    />
  );
}
