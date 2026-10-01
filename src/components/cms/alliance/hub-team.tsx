"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, MailPlus, ShieldOff } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Select } from "@/components/cms/ui/field";
import { Badge, EmptyState, Panel } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { relativeTime } from "@/lib/cms/format";
import { PARTNER_ROLES, partnerRoleLabel } from "@/lib/alliance/constants";

type Person = { id: string; name: string; email: string; role: string; status: string; totpEnabled: boolean; lastLoginAt: string | null };

/**
 * Equipe da empresa no Alliance Hub, vista pela Rocket: convidar (o primeiro convite costuma ser o
 * Partner Owner), mudar papéis, desativar e desfazer o 2FA de quem perdeu o celular.
 */
export function HubTeamAdmin({ partnerId, people, canManage, open }: { partnerId: string; people: Person[]; canManage: boolean; open: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", role: people.some((p) => p.role === "owner") ? "member" : "owner" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: "disable" | "2fa"; person: Person }>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.fields ?? {});
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const invite = (input: { name: string; email: string; role: string }, resend = false) =>
    run(resend ? `resend-${input.email}` : "invite", async () => {
      setErrors({});
      const result = await api<{ delivered: boolean; link: string | null }>(`/api/cms/alliance/partners/${partnerId}/users`, { body: input });
      setLink(result.link);
      toast.success(result.delivered ? "Convite enviado por e-mail." : "Convite criado. Copie o link e envie para a pessoa.");
      if (!resend) setForm({ name: "", email: "", role: "member" });
      router.refresh();
    });

  const patch = (person: Person, body: { role?: string; status?: string }) =>
    run(`patch-${person.id}`, async () => {
      await api(`/api/cms/alliance/partner-users/${person.id}`, { method: "PATCH", body });
      toast.success("Acesso atualizado.");
      setConfirm(null);
      router.refresh();
    });

  const reset2fa = (person: Person) =>
    run(`2fa-${person.id}`, async () => {
      await api(`/api/cms/alliance/partner-users/${person.id}/2fa`, { method: "DELETE" });
      toast.success("Verificação em duas etapas desativada. A pessoa pode configurar de novo.");
      setConfirm(null);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      {!open && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          A empresa está suspensa ou encerrada: ninguém dela entra no Hub. Os acessos voltam a valer quando a situação voltar para onboarding ou ativo.
        </p>
      )}
      <Panel title="Pessoas com acesso" description="Cada pessoa vê só os dados desta empresa. Ninguém do Hub acessa o Content Studio.">
        {people.length === 0 ? (
          <EmptyState title="Ninguém da empresa tem acesso ainda. Comece convidando o Partner Owner." />
        ) : (
          <ul className="-my-2 divide-y divide-zinc-100">
            {people.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {p.name} <span className="font-normal text-zinc-500">· {p.email}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    {p.status === "invited" ? <Badge tone="amber">Convite pendente</Badge> : p.status === "disabled" ? <Badge tone="red">Desativado</Badge> : <Badge tone="green">Ativo</Badge>}
                    {p.totpEnabled && <Badge tone="blue">2FA</Badge>}
                    {p.lastLoginAt ? `Último acesso ${relativeTime(p.lastLoginAt)}` : "Nunca entrou"}
                  </p>
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select aria-label={`Papel de ${p.name}`} value={p.role} disabled={busy !== null} onChange={(e) => patch(p, { role: e.target.value })} className="w-40">
                      {PARTNER_ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                    {p.status === "invited" && (
                      <Button size="sm" variant="secondary" loading={busy === `resend-${p.email}`} onClick={() => invite({ name: p.name, email: p.email, role: p.role }, true)}>
                        <MailPlus className="size-3.5" /> Reenviar
                      </Button>
                    )}
                    {p.status === "active" && (
                      <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "disable", person: p })}>
                        Desativar
                      </Button>
                    )}
                    {p.status === "disabled" && (
                      <Button size="sm" variant="secondary" loading={busy === `patch-${p.id}`} onClick={() => patch(p, { status: "active" })}>
                        Reativar
                      </Button>
                    )}
                    {p.totpEnabled && (
                      <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "2fa", person: p })} title="Desativar a verificação em duas etapas">
                        <ShieldOff className="size-3.5" />
                        <span className="sr-only">Desativar 2FA de {p.name}</span>
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {canManage && open && (
        <Panel title="Convidar para o Alliance Hub" description="A pessoa recebe um link de uso único (7 dias) para criar a senha. O convite não dá acesso sozinho.">
          <form
            className="grid gap-4 sm:grid-cols-[1fr_1fr_11rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void invite(form);
            }}
          >
            <Field label="Nome" error={errors.name}>
              {(p) => <Input {...p} value={form.name} maxLength={80} required onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            </Field>
            <Field label="E-mail" error={errors.email}>
              {(p) => <Input {...p} type="email" value={form.email} maxLength={160} required onChange={(e) => setForm({ ...form, email: e.target.value })} />}
            </Field>
            <Field label="Papel" error={errors.role}>
              {(p) => (
                <Select {...p} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {PARTNER_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button type="submit" loading={busy === "invite"}>
              Convidar
            </Button>
          </form>
          <p className="mt-3 text-[13px] text-zinc-500">{PARTNER_ROLES.find((r) => r.key === form.role)?.description}</p>
          {link && (
            <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[13px] text-zinc-700">O e-mail não está configurado. Envie este link por um canal seguro (vale 7 dias, uso único):</p>
              <div className="mt-2 flex gap-2">
                <Input readOnly value={link} aria-label="Link do convite" className="font-mono text-xs" />
                <Button
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(link);
                    toast.success("Link copiado.");
                  }}
                >
                  <Copy className="size-4" /> Copiar
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      <ConfirmDialog
        open={confirm?.kind === "disable"}
        title={`Desativar ${confirm?.person.name}?`}
        description="A pessoa sai do Hub na hora (todas as sessões são encerradas). Dá para reativar depois."
        confirmLabel="Desativar"
        loading={busy !== null}
        onConfirm={() => confirm && patch(confirm.person, { status: "disabled" })}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "2fa"}
        title={`Desativar o 2FA de ${confirm?.person.name}?`}
        description={`Use só se a pessoa perdeu o celular e os códigos de recuperação, depois de confirmar a identidade dela por outro canal. As sessões de ${confirm ? partnerRoleLabel(confirm.person.role) : ""} são encerradas.`}
        confirmLabel="Desativar 2FA"
        loading={busy !== null}
        onConfirm={() => confirm && reset2fa(confirm.person)}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
