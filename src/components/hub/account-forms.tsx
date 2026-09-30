"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Field, Input } from "@/components/cms/ui/field";
import { Badge, Panel } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";

function useSubmit() {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function run<T>(key: string, fn: () => Promise<T>, ok?: string) {
    setBusy(key);
    setErrors({});
    try {
      const r = await fn();
      if (ok) toast.success(ok);
      router.refresh();
      return r;
    } catch (e) {
      setErrors((e as ApiError).fields ?? {});
      toast.error((e as ApiError).message);
      return null;
    } finally {
      setBusy(null);
    }
  }
  return { busy, errors, run };
}

export function ProfileForm({ name }: { name: string }) {
  const [v, setV] = useState(name);
  const { busy, errors, run } = useSubmit();
  return (
    <form onSubmit={(e) => { e.preventDefault(); void run("p", () => api("/api/alliance/hub/account", { method: "PATCH", body: { name: v } }), "Nome atualizado."); }} className="space-y-4">
      <Field label="Nome" error={errors.name}>{(p) => <Input {...p} value={v} maxLength={80} onChange={(e) => setV(e.target.value)} />}</Field>
      <Button type="submit" variant="secondary" loading={busy === "p"} disabled={v === name}>Salvar</Button>
    </form>
  );
}

export function PasswordForm() {
  const [v, setV] = useState({ currentPassword: "", newPassword: "" });
  const { busy, errors, run } = useSubmit();
  return (
    <form onSubmit={async (e) => { e.preventDefault(); if (await run("pw", () => api("/api/alliance/hub/account/password", { body: v }), "Senha alterada. As outras sessões foram encerradas.")) setV({ currentPassword: "", newPassword: "" }); }} className="space-y-4">
      <Field label="Senha atual" error={errors.currentPassword}>{(p) => <Input {...p} type="password" autoComplete="current-password" value={v.currentPassword} onChange={(e) => setV({ ...v, currentPassword: e.target.value })} />}</Field>
      <Field label="Nova senha" hint="Pelo menos 12 caracteres." error={errors.newPassword}>{(p) => <Input {...p} type="password" autoComplete="new-password" value={v.newPassword} onChange={(e) => setV({ ...v, newPassword: e.target.value })} />}</Field>
      <Button type="submit" variant="secondary" loading={busy === "pw"}>Trocar senha</Button>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [v, setV] = useState({ email: "", password: "" });
  const [sent, setSent] = useState(false);
  const { busy, errors, run } = useSubmit();
  return (
    <form onSubmit={async (e) => { e.preventDefault(); if ((await run("em", () => api("/api/alliance/hub/account/email", { body: v }))) !== null) setSent(true); }} className="space-y-4">
      <p className="text-[13px] text-zinc-600">E-mail atual: <span className="font-medium text-zinc-900">{email}</span></p>
      {sent && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">Se o endereço estiver disponível, enviamos um link de confirmação para ele. A troca só vale depois de confirmar.</p>}
      <Field label="Novo e-mail" error={errors.email}>{(p) => <Input {...p} type="email" value={v.email} maxLength={160} onChange={(e) => setV({ ...v, email: e.target.value })} />}</Field>
      <Field label="Sua senha" error={errors.password}>{(p) => <Input {...p} type="password" autoComplete="current-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />}</Field>
      <Button type="submit" variant="secondary" loading={busy === "em"}>Enviar confirmação</Button>
    </form>
  );
}

/** Verificação em duas etapas: QR code (ou chave), confirmação com código e códigos de recuperação. */
export function TwoFactor({ enabled, available }: { enabled: boolean; available: boolean }) {
  const toast = useToast();
  const [setup, setSetup] = useState<{ key: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const { busy, errors, run } = useSubmit();

  if (!available) return <p className="text-[13px] text-zinc-500">A verificação em duas etapas ainda não foi habilitada pela Rocket Vision.</p>;

  if (codes) {
    return (
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-700">Guarde estes códigos em um lugar seguro. Cada um entra uma vez, se você perder o celular. Eles não aparecem de novo.</p>
        <ul className="grid grid-cols-2 gap-2 rounded-md bg-zinc-50 p-4 font-mono text-[13px] ring-1 ring-zinc-200">
          {codes.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { void navigator.clipboard.writeText(codes.join("\n")); toast.success("Códigos copiados."); }}>
            <Copy className="size-3.5" /> Copiar
          </Button>
          <Button size="sm" onClick={() => setCodes(null)}>Concluir</Button>
        </div>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-[13px] text-emerald-800"><ShieldCheck className="size-4" /> Ativa. O login pede o código do aplicativo.</p>
        <Field label="Sua senha (para mudar a verificação)" error={errors.password}>{(p) => <Input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" loading={busy === "rc"} disabled={!password} onClick={async () => { const r = await run("rc", () => api<{ recoveryCodes: string[] }>("/api/alliance/hub/account/totp/recovery", { body: { password } })); if (r) { setCodes(r.recoveryCodes); setPassword(""); } }}>
            Gerar novos códigos de recuperação
          </Button>
          <Button size="sm" variant="ghost" loading={busy === "off"} disabled={!password} onClick={async () => { if ((await run("off", () => api("/api/alliance/hub/account/totp", { method: "DELETE", body: { password } }), "Verificação em duas etapas desativada.")) !== null) setPassword(""); }}>
            Desativar
          </Button>
        </div>
      </div>
    );
  }

  if (setup) {
    return (
      <form onSubmit={async (e) => { e.preventDefault(); const r = await run("cf", () => api<{ recoveryCodes: string[] }>("/api/alliance/hub/account/totp", { method: "PUT", body: { code } }), "Verificação em duas etapas ativada."); if (r) { setCodes(r.recoveryCodes); setSetup(null); } }} className="space-y-4">
        <p className="text-[13px] text-zinc-700">Leia o QR code no aplicativo autenticador (Google Authenticator, 1Password, Authy...) e digite o código que aparecer.</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR gerado localmente, em data URL */}
          <img src={setup.qr} alt="QR code para o aplicativo autenticador" width={176} height={176} className="rounded-md ring-1 ring-zinc-200" />
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Ou digite a chave:</p>
            <p className="mt-1 font-mono text-[13px] break-all text-zinc-900">{setup.key.match(/.{1,4}/g)?.join(" ")}</p>
          </div>
        </div>
        <Field label="Código de 6 números" error={errors.code}>{(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="max-w-40 font-mono tracking-[0.3em]" />}</Field>
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={busy === "cf"} disabled={code.length !== 6}>Ativar</Button>
          <Button size="sm" variant="ghost" onClick={() => setSetup(null)}>Cancelar</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-zinc-600">Além da senha, o login pede um código do aplicativo autenticador do seu celular. <Badge tone="amber">Recomendado</Badge></p>
      <Button size="sm" loading={busy === "st"} onClick={async () => {
        const r = await run("st", () => api<{ key: string; uri: string }>("/api/alliance/hub/account/totp", { method: "POST" }));
        if (r) setSetup({ key: r.key, qr: await QRCode.toDataURL(r.uri, { margin: 1, width: 352, errorCorrectionLevel: "M" }) });
      }}>
        Ativar verificação em duas etapas
      </Button>
    </div>
  );
}

export function SessionsPanel({ count }: { count: number }) {
  const { busy, run } = useSubmit();
  return (
    <Panel title="Sessões" description={count > 1 ? `Você está conectado em ${count} dispositivos.` : "Só este dispositivo está conectado."}>
      <Button size="sm" variant="secondary" disabled={count <= 1} loading={busy === "s"} onClick={() => run("s", () => api("/api/alliance/hub/account/sessions", { method: "DELETE" }), "Os outros dispositivos foram desconectados.")}>
        Sair dos outros dispositivos
      </Button>
    </Panel>
  );
}
