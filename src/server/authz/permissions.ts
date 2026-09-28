/**
 * Catálogo de permissões do CMS.
 *
 * A autorização é sempre feita por permissão, nunca pelo nome da função:
 * funções são apenas conjuntos de permissões guardados no banco e podem ser criadas ou ajustadas.
 * Este arquivo é a fonte da verdade das chaves; o seed sincroniza a tabela `permissions`.
 */

export const PERMISSIONS = {
  "landing.view": "Ver o conteúdo da landing page",
  "landing.edit": "Editar rascunhos da landing page",
  "landing.publish": "Publicar a landing page",

  "projects.view": "Ver projetos",
  "projects.create": "Criar projetos",
  "projects.edit": "Editar projetos",
  "projects.publish": "Publicar e despublicar projetos",
  "projects.archive": "Arquivar projetos",
  "projects.delete": "Excluir projetos",

  "media.view": "Ver a biblioteca de mídia",
  "media.upload": "Enviar imagens",
  "media.edit": "Editar informações de imagens",
  "media.delete": "Remover imagens",

  "users.view": "Ver usuários",
  "users.create": "Convidar usuários",
  "users.edit": "Editar usuários e encerrar sessões",
  "users.disable": "Desativar e reativar usuários",
  "users.manage_roles": "Gerenciar funções e permissões",

  "audit.view": "Ver a auditoria",

  "settings.view": "Ver as configurações do site",
  "settings.edit": "Editar as configurações do site",
  "settings.publish": "Publicar as configurações do site",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function isPermission(value: string): value is Permission {
  return Object.hasOwn(PERMISSIONS, value);
}

/** Agrupamento para exibição na interface de funções. */
export const PERMISSION_GROUPS: { label: string; prefix: string }[] = [
  { label: "Landing page", prefix: "landing." },
  { label: "Projetos", prefix: "projects." },
  { label: "Mídia", prefix: "media." },
  { label: "Usuários", prefix: "users." },
  { label: "Auditoria", prefix: "audit." },
  { label: "Configurações", prefix: "settings." },
];

/** Função com acesso total e proteções extras (não pode ficar sem ao menos um usuário ativo). */
export const OWNER_ROLE_KEY = "owner";

/** Funções criadas pelo seed. Podem ser ajustadas depois, exceto a de owner. */
export const DEFAULT_ROLES: {
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
}[] = [
  {
    key: OWNER_ROLE_KEY,
    name: "Owner",
    description: "Acesso total, incluindo gestão de outros owners.",
    isSystem: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "admin",
    name: "Administrador",
    description: "Gerencia conteúdo, usuários e configurações.",
    isSystem: false,
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "editor",
    name: "Editor",
    description: "Edita e publica conteúdo e projetos.",
    isSystem: false,
    permissions: [
      "landing.view",
      "landing.edit",
      "landing.publish",
      "projects.view",
      "projects.create",
      "projects.edit",
      "projects.publish",
      "projects.archive",
      "media.view",
      "media.upload",
      "media.edit",
      "settings.view",
    ],
  },
  {
    key: "collaborator",
    name: "Colaborador",
    description: "Cria e edita rascunhos. Não publica.",
    isSystem: false,
    permissions: [
      "landing.view",
      "landing.edit",
      "projects.view",
      "projects.create",
      "projects.edit",
      "media.view",
      "media.upload",
      "media.edit",
    ],
  },
];
