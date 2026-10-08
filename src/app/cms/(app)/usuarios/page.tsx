import type { Metadata } from "next";
import { UsersAdmin } from "@/components/cms/users/users-admin";
import { requirePermission } from "@/server/authz/guard";
import { OWNER_ROLE_KEY } from "@/server/authz/permissions";
import { isMailConfigured, listRoles, listUsers } from "@/server/users/service";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage() {
  const user = await requirePermission("users.view", "/cms/usuarios");
  const [users, roles] = await Promise.all([listUsers(), listRoles()]);
  const isOwner = user.roleKey === OWNER_ROLE_KEY;

  return (
    <div>
      <UsersAdmin
        header={{ title: "Pessoas", description: "Quem acessa o CMS e com qual função. Senhas nunca aparecem aqui: o acesso é por convite ou link de redefinição." }}
        users={users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString() }))}
        roles={roles.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          // Mesma regra do servidor: owner só por owner; nenhuma permissão além das suas.
          grantable: (r.key !== OWNER_ROLE_KEY || isOwner) && r.permissions.every((p) => user.permissions.has(p)),
        }))}
        currentUserId={user.id}
        mailConfigured={isMailConfigured()}
        perms={{
          canCreate: user.permissions.has("users.create"),
          canEdit: user.permissions.has("users.edit"),
          canDisable: user.permissions.has("users.disable"),
          canManageRoles: user.permissions.has("users.manage_roles"),
          isOwner,
        }}
      />
    </div>
  );
}
