import type { Metadata } from "next";
import { ExpiredLink } from "@/components/cms/auth/expired-link";
import { SetPasswordForm } from "@/components/cms/auth/set-password-form";
import { peekToken } from "@/server/auth/service";

export const metadata: Metadata = { title: "Nova senha", referrer: "no-referrer" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await peekToken(token, "password_reset");
  if (!valid) return <ExpiredLink kind="reset" />;
  return (
    <SetPasswordForm
      token={token}
      endpoint="/api/cms/auth/password-reset/confirm"
      title="Criar nova senha"
      description={`Conta ${valid.email}. Ao salvar, as sessões abertas serão encerradas.`}
      submitLabel="Salvar senha"
    />
  );
}
