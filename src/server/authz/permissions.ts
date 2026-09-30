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

  "diagnostics.view": "Ver os diagnósticos enviados pelo site",
  "diagnostics.manage": "Mudar a etapa e anotar os diagnósticos",
  "diagnostics.delete": "Excluir diagnósticos",

  "settings.view": "Ver as configurações do site",
  "settings.edit": "Editar as configurações do site",
  "settings.publish": "Publicar as configurações do site",

  "blog.view": "Acessar o Blog no Studio",
  "blog.create": "Criar artigos",
  "blog.edit_own": "Editar os próprios artigos e enviar para revisão",
  "blog.edit_any": "Editar artigos de qualquer autor",
  "blog.review": "Ver a fila de revisão e comentar artigos",
  "blog.approve": "Aprovar artigos e devolver com comentários",
  "blog.publish": "Publicar, agendar e despublicar artigos",
  "blog.delete": "Excluir artigos",
  "blog.categories": "Gerenciar categorias do Blog",
  "blog.authors": "Gerenciar autores do Blog",

  "alliance.view": "Ver o Rocket Alliance: visão geral, parceiros e indicações",
  "alliance.applications": "Avaliar candidaturas ao Rocket Alliance",
  "alliance.partners": "Cadastrar parceiros e convidar pessoas para o Alliance Hub",
  "alliance.publish": "Publicar parceiros no diretório e editar as páginas exclusivas",
  "alliance.referrals": "Gerenciar as indicações dos parceiros",
  "alliance.finance": "Ver e gerenciar comissões, recebimentos e pagamentos a parceiros",
  "alliance.contracts": "Gerenciar contratos e termos de parceria",
  "alliance.resources": "Gerenciar materiais, treinamentos e oportunidades do Alliance Hub",
  "alliance.communications": "Enviar comunicados e atender o suporte dos parceiros",
  "alliance.settings": "Alterar regras, níveis, modalidades e conteúdo público do programa",
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
  { label: "Diagnósticos", prefix: "diagnostics." },
  { label: "Configurações", prefix: "settings." },
  { label: "Blog", prefix: "blog." },
  { label: "Rocket Alliance", prefix: "alliance." },
];

/** Todas as permissões do Blog (editores e administradores recebem o módulo inteiro). */
export const BLOG_PERMISSIONS = ALL_PERMISSIONS.filter((p) => p.startsWith("blog."));

/** O que um autor precisa para escrever: criar, editar os próprios artigos e enviar para revisão. */
export const BLOG_AUTHOR_PERMISSIONS: Permission[] = ["blog.view", "blog.create", "blog.edit_own"];

/** Todas as permissões do Rocket Alliance. */
export const ALLIANCE_PERMISSIONS = ALL_PERMISSIONS.filter((p) => p.startsWith("alliance."));

/**
 * Dados financeiros, contratos e configurações do programa nunca vêm junto com outras áreas:
 * só o owner (e quem receber explicitamente, como o Gestor do Alliance) tem acesso.
 */
export const ALLIANCE_SENSITIVE_PERMISSIONS: Permission[] = ["alliance.finance", "alliance.contracts", "alliance.settings"];

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
    // Opera o Rocket Alliance, mas sem finanças, contratos e configurações do programa.
    permissions: ALL_PERMISSIONS.filter((p) => !ALLIANCE_SENSITIVE_PERMISSIONS.includes(p)),
  },
  {
    key: "alliance_manager",
    name: "Gestor do Alliance",
    description: "Administra o Rocket Alliance inteiro, inclusive comissões, contratos e configurações. Não edita o site.",
    isSystem: false,
    permissions: [...ALLIANCE_PERMISSIONS, "media.view", "media.upload", "media.edit"],
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
      ...BLOG_PERMISSIONS,
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
      ...BLOG_AUTHOR_PERMISSIONS,
    ],
  },
  {
    key: "columnist",
    name: "Colunista",
    description: "Escreve artigos para o Blog e envia para revisão. Vê só o Blog e a própria conta.",
    isSystem: false,
    // Sem permissões de mídia: as imagens do Colunista passam pelas rotas do Blog, que mostram só as dele.
    permissions: BLOG_AUTHOR_PERMISSIONS,
  },
];
