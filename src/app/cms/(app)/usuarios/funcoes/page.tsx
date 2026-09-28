import type { Metadata } from "next";
import { PageHeader } from "@/components/cms/ui/layout";
import { RolesAdmin } from "@/components/cms/users/roles-admin";
import { UsersTabs } from "@/components/cms/users/users-tabs";
import { requirePermission } from "@/server/authz/guard";
import { listRoles } from "@/server/users/service";

export const metadata: Metadata = { title: "Funções e permissões" };

export default async function RolesPage() {
  const user = await requirePermission("users.view", "/cms/usuarios/funcoes");
  const roles = await listRoles();
  return (
    <div className="max-w-5xl">
      <PageHeader title="Usuários" description="Cada função é um conjunto de permissões. Mudanças valem na hora para quem já está logado." />
      <UsersTabs active="roles" />
      <RolesAdmin
        roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name, description: r.description, isSystem: r.isSystem, permissions: r.permissions, userCount: r.userCount }))}
        mine={[...user.permissions]}
        canManage={user.permissions.has("users.manage_roles")}
      />
    </div>
  );
}
