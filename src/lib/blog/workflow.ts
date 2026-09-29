import type { Permission } from "@/server/authz/permissions";

/**
 * Fluxo editorial do Blog: quem pode levar um artigo de um estado a outro.
 *
 * A tabela é a única fonte da verdade. O servidor valida toda mudança de estado por ela, e o Studio
 * usa a mesma tabela só para decidir quais botões mostrar.
 */

export type BlogStatus = "draft" | "in_review" | "approved" | "scheduled" | "published" | "archived";

export const STATUS_LABELS: Record<BlogStatus, string> = {
  draft: "Rascunho",
  in_review: "Em revisão",
  approved: "Aprovado",
  scheduled: "Agendado",
  published: "Publicado",
  archived: "Arquivado",
};

/** Cor do selo de cada estado no Studio. */
export const STATUS_TONE: Record<BlogStatus, "neutral" | "blue" | "green" | "amber"> = {
  draft: "neutral",
  in_review: "blue",
  approved: "amber",
  scheduled: "amber",
  published: "green",
  archived: "neutral",
};

export type BlogAction = "submit" | "request_changes" | "approve" | "publish" | "schedule" | "unschedule" | "unpublish" | "archive" | "restore";

type Rule = {
  from: BlogStatus[];
  to: BlogStatus;
  permission: Permission;
  /** O autor do artigo pode fazer a ação só com `blog.edit_own`. */
  owner?: boolean;
  label: string;
  done: string;
};

export const TRANSITIONS: Record<BlogAction, Rule> = {
  submit: { from: ["draft"], to: "in_review", permission: "blog.edit_any", owner: true, label: "Enviar para revisão", done: "Artigo enviado para revisão." },
  request_changes: { from: ["in_review", "approved"], to: "draft", permission: "blog.approve", label: "Devolver com comentários", done: "Artigo devolvido ao autor." },
  approve: { from: ["in_review"], to: "approved", permission: "blog.approve", label: "Aprovar", done: "Artigo aprovado." },
  publish: { from: ["approved", "scheduled", "published"], to: "published", permission: "blog.publish", label: "Publicar", done: "Artigo publicado." },
  schedule: { from: ["approved", "scheduled"], to: "scheduled", permission: "blog.publish", label: "Agendar publicação", done: "Publicação agendada." },
  unschedule: { from: ["scheduled"], to: "approved", permission: "blog.publish", label: "Cancelar agendamento", done: "Agendamento cancelado." },
  unpublish: { from: ["published"], to: "approved", permission: "blog.publish", label: "Despublicar", done: "Artigo retirado do ar." },
  archive: { from: ["draft", "in_review", "approved", "published"], to: "archived", permission: "blog.publish", label: "Arquivar", done: "Artigo arquivado." },
  restore: { from: ["archived"], to: "draft", permission: "blog.edit_any", owner: true, label: "Restaurar como rascunho", done: "Artigo restaurado como rascunho." },
};

export const BLOG_ACTIONS = Object.keys(TRANSITIONS) as BlogAction[];

/** Estados em que o autor, só com `blog.edit_own`, ainda pode editar o texto. */
export const OWNER_EDITABLE: BlogStatus[] = ["draft", "in_review"];

type Who = { can: (p: Permission) => boolean; isOwner: boolean };

export function canTransition(action: BlogAction, status: BlogStatus, who: Who) {
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(status)) return false;
  if (who.can(rule.permission)) return true;
  return Boolean(rule.owner && who.isOwner && who.can("blog.edit_own"));
}

export function availableActions(status: BlogStatus, who: Who) {
  return BLOG_ACTIONS.filter((a) => canTransition(a, status, who));
}

/** Pode editar o texto do artigo neste estado? */
export function canEditContent(status: BlogStatus, who: Who) {
  if (status === "archived") return false;
  if (who.can("blog.edit_any")) return true;
  return who.isOwner && who.can("blog.edit_own") && OWNER_EDITABLE.includes(status);
}
