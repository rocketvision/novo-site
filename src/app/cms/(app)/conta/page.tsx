import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { PasswordForm } from "@/components/cms/account/password-form";
import { ProfileForm } from "@/components/cms/account/profile-form";
import { SessionsList } from "@/components/cms/account/sessions-list";
import { describeUserAgent } from "@/lib/cms/user-agent";
import { requireSession } from "@/server/authz/guard";
import { listOwnSessions } from "@/server/cms/account";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const session = await requireSession("/cms/conta");
  const { user } = session;
  const sessions = await listOwnSessions(user.id, session.id);

  return (
    <>
      <PageHeader title="Minha conta" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Perfil">
          <ProfileForm name={user.name} email={user.email} roleName={user.roleName} />
        </Panel>
        <Panel title="Senha" description="Ao trocar a senha, as sessões em outros dispositivos são encerradas.">
          <PasswordForm />
        </Panel>
        <Panel title="Sessões ativas" description="Dispositivos conectados à sua conta agora." className="lg:col-span-2">
          <SessionsList
            sessions={sessions.map((s) => ({
              id: s.id,
              device: describeUserAgent(s.userAgent),
              ipAddress: s.ipAddress,
              createdAt: s.createdAt.toISOString(),
              lastSeenAt: s.lastSeenAt.toISOString(),
              current: s.current,
            }))}
          />
        </Panel>
      </div>
    </>
  );
}
