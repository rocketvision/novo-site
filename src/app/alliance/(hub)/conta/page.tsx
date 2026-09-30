import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { EmailForm, PasswordForm, ProfileForm, SessionsPanel, TwoFactor } from "@/components/hub/account-forms";
import { partnerRoleLabel } from "@/lib/alliance/constants";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { listHubSessions } from "@/server/alliance/hub/session";
import { isTwoFactorAvailable } from "@/server/alliance/hub/totp";

export const metadata: Metadata = { title: "Minha conta" };

export default async function HubAccountPage() {
  const { user } = await requireHubSession();
  const sessions = await listHubSessions(user.id);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Minha conta" description={`${partnerRoleLabel(user.role)} da ${user.partner.tradeName}.`} />
      <Panel title="Perfil"><ProfileForm name={user.name} /></Panel>
      <section id="seguranca" className="scroll-mt-20">
        <Panel title="Verificação em duas etapas"><TwoFactor enabled={user.totpEnabled} available={isTwoFactorAvailable()} /></Panel>
      </section>
      <Panel title="Senha"><PasswordForm /></Panel>
      <Panel title="E-mail"><EmailForm email={user.email} /></Panel>
      <SessionsPanel count={sessions.length} />
    </div>
  );
}
