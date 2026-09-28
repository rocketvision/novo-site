"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, LogOut, Mail, Power, UserPlus, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Select } from "@/components/cms/ui/field";
import { Badge } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { formatDateTime, relativeTime } from "@/lib/cms/format";

export type UserRowDTO = {
  id: string;
  email: string;
  name: string;
  status: "invited" | "active" | "disabled";
  roleId: string;
  roleKey: string;
  roleName: string;
  lastLoginAt: string | null;
  createdAt: string;
  version: number;
  activeSessions: number;
};

export type RoleOption = { id: string; key: string; name: string; grantable: boolean };

type Perms = { canCreate: boolean; canEdit: boolean; canDisable: boolean; canManageRoles: boolean; isOwner: boolean };

const STATUS: Record<UserRowDTO["status"], { tone: "green" | "amber" | "neutral"; label: string }> = {
  active: { tone: "green", label: "Ativo" },
  invited: { tone: "amber", label: "Convite pendente" },
  disabled: { tone: "neutral", label: "Desativado" },
};

/** Link de uso único mostrado uma vez para quem gerou, com botão de copiar. */
function LinkBox({ link, note }: { link: string; note: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-[13px] text-amber-900">{note}</p>
      <div className="mt-2 flex gap-2">
        <Input readOnly value={link} aria-label="Link" onFocus={(e) => e.target.select()} className="font-mono text-xs" />
        <Button
          variant="secondary"
          size="sm"
          className="h-9"
          onClick={async () => {
            await navigator.clipboard.writeText(link).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}

function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return ref;
}

export function UsersAdmin({ users, roles, currentUserId, perms, mailConfigured }: { users: UserRowDTO[]; roles: RoleOption[]; currentUserId: string; perms: Perms; mailConfigured: boolean }) {
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const user = users.find((u) => u.id === selected) ?? null;

  return (
    <>
      {perms.canCreate && (
        <div className="mb-5 flex justify-end">
          <Button size="sm" onClick={() => setInviting(true)}>
            <UserPlus className="size-4" /> Convidar pessoa
          </Button>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="hidden border-b border-zinc-100 bg-zinc-50/60 text-xs text-zinc-500 md:table-header-group">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Pessoa</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Função</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Situação</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Último acesso</th>
              <th scope="col" className="px-4 py-2.5"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((u) => (
              <tr key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 md:table-row md:p-0">
                <td className="min-w-0 flex-1 md:px-4 md:py-3">
                  <p className="truncate font-medium text-zinc-900">
                    {u.name}
                    {u.id === currentUserId && <span className="ml-2 text-xs font-normal text-zinc-500">você</span>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{u.email}</p>
                </td>
                <td className="text-[13px] text-zinc-700 md:px-4 md:py-3">{u.roleName}</td>
                <td className="md:px-4 md:py-3">
                  <Badge tone={STATUS[u.status].tone}>{STATUS[u.status].label}</Badge>
                </td>
                <td className="w-full text-xs text-zinc-500 md:w-auto md:px-4 md:py-3">
                  {u.lastLoginAt ? <span title={formatDateTime(u.lastLoginAt)}>{relativeTime(u.lastLoginAt)}</span> : "Nunca entrou"}
                  {u.activeSessions > 0 && ` · ${u.activeSessions} ${u.activeSessions === 1 ? "sessão ativa" : "sessões ativas"}`}
                </td>
                <td className="md:px-4 md:py-3 md:text-right">
                  {u.id !== currentUserId && (perms.canEdit || perms.canDisable || perms.canCreate) && (
                    <Button variant="secondary" size="sm" onClick={() => setSelected(u.id)} aria-label={`Gerenciar ${u.name}`}>
                      Gerenciar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InviteDialog open={inviting} onClose={() => setInviting(false)} roles={roles} mailConfigured={mailConfigured} />
      {user && <UserDialog key={`${user.id}-${user.version}`} user={user} roles={roles} perms={perms} onClose={() => setSelected(null)} />}
    </>
  );
}

function InviteDialog({ open, onClose, roles, mailConfigured }: { open: boolean; onClose: () => void; roles: RoleOption[]; mailConfigured: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const ref = useDialog(open);
  const grantable = roles.filter((r) => r.grantable);
  const [values, setValues] = useState({ email: "", name: "", roleId: grantable.find((r) => r.key === "editor")?.id ?? grantable[0]?.id ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  function close() {
    setValues((v) => ({ ...v, email: "", name: "" }));
    setErrors({});
    setLink(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrors({});
    try {
      const result = await api<{ link: string | null; emailed: boolean }>("/api/cms/users", { body: values });
      router.refresh();
      if (result.link) setLink(result.link);
      else {
        toast.success(`Convite enviado para ${values.email}.`);
        close();
      }
    } catch (err) {
      const error = err as ApiError;
      if (Object.keys(error.fields).length) setErrors(error.fields);
      else toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog ref={ref} onClose={close} aria-labelledby="invite-title" className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40">
      <form onSubmit={submit} noValidate>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 id="invite-title" className="text-[15px] font-semibold">Convidar pessoa</h2>
          <button type="button" onClick={close} aria-label="Fechar" className="rounded p-1 text-zinc-500 hover:bg-zinc-100"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          {link ? (
            <LinkBox link={link} note={mailConfigured ? "O e-mail não pôde ser enviado. Envie este link por outro canal. Ele vale por 7 dias e só pode ser usado uma vez." : "O envio de e-mail não está configurado. Envie este link para a pessoa por um canal seguro. Ele vale por 7 dias e só pode ser usado uma vez."} />
          ) : (
            <>
              <Field label="E-mail" error={errors.email}>
                {(p) => <Input {...p} type="email" autoComplete="off" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} autoFocus />}
              </Field>
              <Field label="Nome" error={errors.name}>
                {(p) => <Input {...p} value={values.name} maxLength={120} onChange={(e) => setValues({ ...values, name: e.target.value })} />}
              </Field>
              <Field label="Função" error={errors.roleId} hint="Só aparecem funções com permissões que você também tem.">
                {(p) => (
                  <Select {...p} value={values.roleId} onChange={(e) => setValues({ ...values, roleId: e.target.value })}>
                    {grantable.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
          {link ? (
            <Button onClick={close}>Concluir</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={close} disabled={loading}>Cancelar</Button>
              <Button type="submit" loading={loading}>{mailConfigured ? "Enviar convite" : "Gerar convite"}</Button>
            </>
          )}
        </div>
      </form>
    </dialog>
  );
}

function UserDialog({ user, roles, perms, onClose }: { user: UserRowDTO; roles: RoleOption[]; perms: Perms; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const ref = useDialog(true);
  const [name, setName] = useState(user.name);
  const [roleId, setRoleId] = useState(user.roleId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; note: string } | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const ownerLocked = user.roleKey === "owner" && !perms.isOwner;
  const dirty = name.trim() !== user.name || roleId !== user.roleId;
  const roleOptions = roles.filter((r) => r.grantable || r.id === user.roleId);

  async function run(kind: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      const err = e as ApiError;
      if (Object.keys(err.fields).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run("save", async () => {
      await api(`/api/cms/users/${user.id}`, { method: "PATCH", body: { name, roleId, version: user.version } });
      toast.success("Usuário atualizado.");
      router.refresh();
      onClose();
    });

  const setStatus = (status: "active" | "disabled") =>
    run("status", async () => {
      await api(`/api/cms/users/${user.id}/status`, { body: { status, version: user.version } });
      toast.success(status === "disabled" ? "Conta desativada e sessões encerradas." : "Conta reativada.");
      setConfirmDisable(false);
      router.refresh();
      onClose();
    });

  const revoke = () =>
    run("revoke", async () => {
      const { revoked } = await api<{ revoked: number }>(`/api/cms/users/${user.id}/sessions`, { method: "DELETE" });
      toast.success(revoked === 0 ? "Não havia sessões abertas." : revoked === 1 ? "1 sessão encerrada." : `${revoked} sessões encerradas.`);
      router.refresh();
    });

  const generate = (kind: "invite" | "reset-link") =>
    run(kind, async () => {
      const result = await api<{ link: string | null; emailed: boolean }>(`/api/cms/users/${user.id}/${kind}`, { method: "POST" });
      if (result.link) {
        setLink({
          url: result.link,
          note: kind === "invite" ? "Novo convite gerado. O anterior deixou de valer. Envie este link por um canal seguro (7 dias, uso único)." : "Envie este link por um canal seguro. Ele vale por 1 hora e só pode ser usado uma vez.",
        });
      } else toast.success(kind === "invite" ? "Convite reenviado por e-mail." : "Link de redefinição enviado por e-mail.");
    });

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="user-title" className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
        <div className="min-w-0">
          <h2 id="user-title" className="truncate text-[15px] font-semibold">{user.name}</h2>
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded p-1 text-zinc-500 hover:bg-zinc-100"><X className="size-4" /></button>
      </div>
      <div className="space-y-5 p-5">
        {ownerLocked && <p className="rounded-md bg-zinc-50 px-3 py-2 text-[13px] text-zinc-600">Só um owner pode alterar outro owner.</p>}
        {link && <LinkBox link={link.url} note={link.note} />}
        <Field label="Nome" error={errors.name}>
          {(p) => <Input {...p} value={name} maxLength={120} readOnly={!perms.canEdit || ownerLocked} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Função" error={errors.roleId} hint={perms.canManageRoles ? undefined : "Trocar a função exige a permissão de gerenciar funções."}>
          {(p) => (
            <Select {...p} value={roleId} disabled={!perms.canManageRoles || ownerLocked} onChange={(e) => setRoleId(e.target.value)}>
              {roleOptions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          )}
        </Field>
        {!ownerLocked && (
          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
            {perms.canCreate && user.status === "invited" && (
              <Button variant="secondary" size="sm" loading={busy === "invite"} disabled={busy !== null} onClick={() => generate("invite")}>
                <Mail className="size-3.5" /> Gerar novo convite
              </Button>
            )}
            {perms.canEdit && user.status === "active" && (
              <Button variant="secondary" size="sm" loading={busy === "reset-link"} disabled={busy !== null} onClick={() => generate("reset-link")}>
                <KeyRound className="size-3.5" /> Link para redefinir senha
              </Button>
            )}
            {perms.canEdit && user.activeSessions > 0 && (
              <Button variant="secondary" size="sm" loading={busy === "revoke"} disabled={busy !== null} onClick={revoke}>
                <LogOut className="size-3.5" /> Encerrar sessões ({user.activeSessions})
              </Button>
            )}
            {perms.canDisable && user.status !== "disabled" && (
              <Button variant="secondary" size="sm" className="text-red-700 hover:bg-red-50" disabled={busy !== null} onClick={() => setConfirmDisable(true)}>
                <Power className="size-3.5" /> Desativar
              </Button>
            )}
            {perms.canDisable && user.status === "disabled" && (
              <Button variant="secondary" size="sm" loading={busy === "status"} disabled={busy !== null} onClick={() => setStatus("active")}>
                <Power className="size-3.5" /> Reativar
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
        <Button variant="secondary" onClick={onClose}>Fechar</Button>
        {perms.canEdit && !ownerLocked && (
          <Button onClick={save} loading={busy === "save"} disabled={!dirty || busy !== null}>Salvar</Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmDisable}
        title={`Desativar ${user.name}?`}
        description="A pessoa perde o acesso na hora: todas as sessões são encerradas e convites pendentes deixam de valer. O histórico é mantido e a conta pode ser reativada."
        confirmLabel="Desativar"
        loading={busy === "status"}
        onConfirm={() => setStatus("disabled")}
        onClose={() => setConfirmDisable(false)}
      />
    </dialog>
  );
}
