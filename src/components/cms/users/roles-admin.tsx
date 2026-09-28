"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input } from "@/components/cms/ui/field";
import { Badge } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { PERMISSION_GROUPS, PERMISSIONS, type Permission } from "@/server/authz/permissions";

export type RoleDTO = {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
};

const ALL = Object.keys(PERMISSIONS) as Permission[];

export function RolesAdmin({ roles, mine, canManage }: { roles: RoleDTO[]; mine: Permission[]; canManage: boolean }) {
  const [editing, setEditing] = useState<RoleDTO | "new" | null>(null);
  const [removing, setRemoving] = useState<RoleDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const own = new Set(mine);

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api(`/api/cms/roles/${removing.id}`, { method: "DELETE" });
      toast.success("Função removida.");
      setRemoving(null);
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {canManage && (
        <div className="mb-5 flex justify-end">
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Nova função
          </Button>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((role) => {
          const manageable = canManage && !role.isSystem && role.permissions.every((p) => own.has(p));
          return (
            <section key={role.id} className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    {role.name}
                    {role.isSystem && (
                      <Badge>
                        <Lock className="size-3" /> Sistema
                      </Badge>
                    )}
                  </h3>
                  {role.description && <p className="mt-1 text-[13px] text-zinc-500">{role.description}</p>}
                </div>
                <span className="shrink-0 text-xs text-zinc-500">{role.userCount === 1 ? "1 pessoa" : `${role.userCount} pessoas`}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {PERMISSION_GROUPS.map((g) => {
                  const keys = ALL.filter((p) => p.startsWith(g.prefix));
                  const granted = keys.filter((k) => role.permissions.includes(k));
                  return (
                    <li key={g.prefix} className="flex gap-3 text-[13px]">
                      <span className="w-28 shrink-0 text-zinc-500">{g.label}</span>
                      <span className={granted.length ? "text-zinc-800" : "text-zinc-400"}>
                        {granted.length === 0 ? "Sem acesso" : granted.length === keys.length ? "Acesso total" : granted.map((k) => PERMISSIONS[k]).join("; ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {manageable && (
                <div className="mt-5 flex gap-2 border-t border-zinc-100 pt-4">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(role)}>Editar</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={role.userCount > 0}
                    title={role.userCount > 0 ? "Troque a função das pessoas antes de remover" : undefined}
                    onClick={() => setRemoving(role)}
                  >
                    Remover
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </div>
      {editing && <RoleDialog role={editing === "new" ? null : editing} own={own} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={removing !== null}
        title={`Remover a função ${removing?.name ?? ""}?`}
        description="Ela deixa de existir. Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        loading={busy}
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

function RoleDialog({ role, own, onClose }: { role: RoleDTO | null; own: Set<Permission>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [perms, setPerms] = useState<Set<Permission>>(new Set(role?.permissions ?? []));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function toggle(p: Permission) {
    setPerms((s) => {
      const next = new Set(s);
      if (next.has(p)) next.delete(p);
      else {
        next.add(p);
        // Qualquer permissão de uma área pressupõe poder ver a área.
        const view = `${p.split(".")[0]}.view` as Permission;
        if (view in PERMISSIONS && own.has(view)) next.add(view);
      }
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrors({});
    try {
      const body = { name, description, permissions: [...perms] };
      if (role) await api(`/api/cms/roles/${role.id}`, { method: "PUT", body });
      else await api("/api/cms/roles", { body });
      toast.success(role ? "Função atualizada. Vale na hora para quem já está logado." : "Função criada.");
      router.refresh();
      onClose();
    } catch (err) {
      const error = err as ApiError;
      if (Object.keys(error.fields).length) setErrors(error.fields);
      else toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="role-title" className="m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40">
      <form onSubmit={submit} noValidate className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 id="role-title" className="text-[15px] font-semibold">{role ? `Editar ${role.name}` : "Nova função"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded p-1 text-zinc-500 hover:bg-zinc-100"><X className="size-4" /></button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" error={errors.name}>
              {(p) => <Input {...p} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus={!role} />}
            </Field>
            <Field label="Descrição" optional error={errors.description}>
              {(p) => <Input {...p} value={description} maxLength={160} onChange={(e) => setDescription(e.target.value)} />}
            </Field>
          </div>
          <fieldset>
            <legend className="text-[13px] font-medium text-zinc-900">Permissões</legend>
            <p className="mt-0.5 text-[13px] text-zinc-500">Permissões que você não tem aparecem bloqueadas.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {PERMISSION_GROUPS.map((g) => (
                <div key={g.prefix} className="rounded-md border border-zinc-200 p-3">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{g.label}</p>
                  <ul className="mt-2 space-y-1.5">
                    {ALL.filter((p) => p.startsWith(g.prefix)).map((p) => (
                      <li key={p}>
                        <label className="flex cursor-pointer items-start gap-2 text-[13px] text-zinc-800 has-[:disabled]:cursor-default has-[:disabled]:text-zinc-400">
                          <input type="checkbox" className="mt-0.5 size-4 accent-zinc-900" checked={perms.has(p)} disabled={!own.has(p)} onChange={() => toggle(p)} />
                          {PERMISSIONS[p]}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" loading={loading}>{role ? "Salvar" : "Criar função"}</Button>
        </div>
      </form>
    </dialog>
  );
}
