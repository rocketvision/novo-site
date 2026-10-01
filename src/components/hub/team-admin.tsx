"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input, Select } from "@/components/cms/ui/field";
import { Badge, Panel } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { relativeTime } from "@/lib/cms/format";
import { PARTNER_ROLES, partnerRoleLabel } from "@/lib/alliance/constants";

type Person = { id: string; name: string; email: string; role: string; status: string; totpEnabled: boolean; lastLoginAt: string | null };

/**
 * Equipe da empresa no Hub. Responsável gerencia papéis e acessos (menos o de outro owner);
 * com a opção habilitada pela Rocket, o Gestor convida membros.
 */
export function HubTeam({ people, me, isOwner, canInvite }: { people: Person[]; me: string; isOwner: boolean; canInvite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", role: "member" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const roles = PARTNER_ROLES.filter((r) => r.key !== "owner" && (isOwner || r.key === "member"));

  async function run(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (e) {
      setErrors((e as ApiError).fields ?? {});
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="Pessoas com acesso" description="Cada pessoa vê só os dados da sua empresa.">
        <ul className="-my-2 divide-y divide-zinc-100">
          {people.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {p.name} {p.id === me && <span className="font-normal text-zinc-500">(você)</span>}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  {p.email}
                  {p.status === "invited" && <Badge tone="amber">Convite pendente</Badge>}
                  {p.status === "disabled" && <Badge tone="red">Desativado</Badge>}
                  {p.totpEnabled && <Badge tone="blue">2FA</Badge>}
                  {p.lastLoginAt && `· último acesso ${relativeTime(p.lastLoginAt)}`}
                </p>
              </div>
              {isOwner && p.id !== me && p.role !== "owner" ? (
                <div className="flex items-center gap-2">
                  <Select aria-label={`Papel de ${p.name}`} value={p.role} disabled={busy !== null} onChange={(e) => run(p.id, () => api(`/api/alliance/hub/team/${p.id}`, { method: "PATCH", body: { role: e.target.value } }), "Papel atualizado.")} className="w-40">
                    {PARTNER_ROLES.filter((r) => r.key !== "owner").map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                  {p.status === "active" && (
                    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run(p.id, () => api(`/api/alliance/hub/team/${p.id}`, { method: "PATCH", body: { status: "disabled" } }), "Acesso desativado.")}>
                      Desativar
                    </Button>
                  )}
                  {p.status === "disabled" && (
                    <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => run(p.id, () => api(`/api/alliance/hub/team/${p.id}`, { method: "PATCH", body: { status: "active" } }), "Acesso reativado.")}>
                      Reativar
                    </Button>
                  )}
                </div>
              ) : (
                <span className="text-[13px] text-zinc-600">{partnerRoleLabel(p.role)}</span>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      {canInvite && (
        <Panel title="Convidar para a equipe" description="A pessoa recebe um link por e-mail para criar a senha (válido por 7 dias).">
          <form
            className="grid gap-4 sm:grid-cols-[1fr_1fr_11rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setErrors({});
              void run("invite", async () => {
                await api("/api/alliance/hub/team", { body: form });
                setForm({ name: "", email: "", role: "member" });
              }, "Convite enviado.");
            }}
          >
            <Field label="Nome" error={errors.name}>{(p) => <Input {...p} value={form.name} maxLength={80} required onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
            <Field label="E-mail" error={errors.email}>{(p) => <Input {...p} type="email" value={form.email} maxLength={160} required onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
            <Field label="Papel" error={errors.role}>
              {(p) => (
                <Select {...p} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {roles.map((r) => (
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
          <ul className="mt-4 space-y-1 text-[13px] text-zinc-500">
            {roles.map((r) => (
              <li key={r.key}>
                <span className="font-medium text-zinc-700">{r.label}:</span> {r.description}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
