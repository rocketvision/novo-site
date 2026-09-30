"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input } from "@/components/cms/ui/field";
import { api, ApiError } from "@/lib/cms/api";

function Alert({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={tone === "error" ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800"}>
      {children}
    </p>
  );
}

/** Login do Hub em dois passos: senha e, com 2FA ativo, o código do aplicativo (ou de recuperação). */
export function HubLoginForm({ next, notice }: { next?: string; notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const done = () => {
    router.replace(next ?? "/alliance");
    router.refresh();
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setFields({});
    try {
      if (!challenge) {
        const r = await api<{ ok?: true; twoFactor?: true; challenge?: string }>("/api/alliance/hub/auth/login", { body: { email, password } });
        if (r.twoFactor && r.challenge) {
          setChallenge(r.challenge);
          setPassword("");
          setLoading(false);
          return;
        }
      } else {
        await api("/api/alliance/hub/auth/two-factor", { body: { challenge, code } });
      }
      done();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, "unknown", "Não foi possível entrar.");
      if (err.status === 410) {
        setChallenge(null);
        setCode("");
      }
      setError(err.status === 422 && Object.keys(err.fields).length ? null : err.message);
      setFields(err.fields);
      if (!challenge) setPassword("");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{challenge ? "Verificação em duas etapas" : "Entrar no Alliance Hub"}</h1>
        <p className="mt-1 text-[13px] text-zinc-500">{challenge ? "Digite o código de 6 números do aplicativo autenticador, ou um código de recuperação." : "O portal exclusivo dos parceiros da Rocket Vision."}</p>
      </div>
      {notice && !error && <Alert tone="ok">{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {!challenge ? (
        <>
          <Field label="E-mail" error={fields.email}>
            {(p) => <Input {...p} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
          </Field>
          <Field label="Senha" error={fields.password}>
            {(p) => <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
        </>
      ) : (
        <Field label="Código" error={fields.code}>
          {(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" required value={code} maxLength={20} onChange={(e) => setCode(e.target.value)} autoFocus className="font-mono tracking-[0.3em]" />}
        </Field>
      )}
      <Button type="submit" className="w-full" loading={loading}>
        {challenge ? "Verificar" : "Entrar"}
      </Button>
      <p className="text-center text-[13px]">
        {challenge ? (
          <button type="button" onClick={() => { setChallenge(null); setCode(""); }} className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
            Voltar
          </button>
        ) : (
          <Link href="/alliance/esqueci-senha" className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
            Esqueci minha senha
          </Link>
        )}
      </p>
      <p className="border-t border-zinc-200 pt-4 text-center text-[13px] text-zinc-500">
        Ainda não é parceiro?{" "}
        <Link href="/partners#aplicar" className="text-zinc-900 underline-offset-4 hover:underline">
          Become a Partner
        </Link>
      </p>
    </form>
  );
}

export function HubForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/alliance/hub/auth/reset/request", { body: { email } });
      setSent(true);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  }
  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold tracking-tight">Confira o seu e-mail</h1>
        <p className="text-[13px] text-zinc-600">Se houver uma conta ativa com este e-mail, enviamos um link para criar uma nova senha. O link vale por 1 hora.</p>
        <Link href="/alliance/login" className="text-[13px] text-zinc-900 underline-offset-4 hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Esqueci minha senha</h1>
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="E-mail">{(p) => <Input {...p} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}</Field>
      <Button type="submit" className="w-full" loading={loading}>
        Enviar link
      </Button>
      <p className="text-center text-[13px]">
        <Link href="/alliance/login" className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}

/** Criar senha: aceite de convite (já entra no Hub) ou redefinição (volta ao login). */
export function HubSetPasswordForm({ token, mode, name, company }: { token: string; mode: "invite" | "reset"; name: string; company: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setFields({ confirm: "As senhas não conferem." });
    setLoading(true);
    setFields({});
    setError(null);
    try {
      await api(mode === "invite" ? "/api/alliance/hub/auth/invite" : "/api/alliance/hub/auth/reset/confirm", { body: { token, password } });
      router.replace(mode === "invite" ? "/alliance" : "/alliance/login?senha=1");
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      setFields(err.fields ?? {});
      setError(Object.keys(err.fields ?? {}).length ? null : err.message);
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{mode === "invite" ? `Bem-vindo, ${name.split(" ")[0]}` : "Crie uma nova senha"}</h1>
        <p className="mt-1 text-[13px] text-zinc-500">{mode === "invite" ? `Crie a sua senha para entrar no Alliance Hub da ${company}.` : `Conta de ${name}, ${company}.`}</p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Nova senha" hint="Pelo menos 12 caracteres. Uma frase fácil de lembrar funciona bem." error={fields.password}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />}
      </Field>
      <Field label="Confirme a senha" error={fields.confirm}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        {mode === "invite" ? "Criar senha e entrar" : "Salvar nova senha"}
      </Button>
    </form>
  );
}

export function HubConfirmEmail({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  async function confirm() {
    setState("loading");
    try {
      await api("/api/alliance/hub/auth/email", { body: { token } });
      setState("done");
    } catch (e) {
      setMessage((e as ApiError).message);
      setState("error");
    }
  }
  if (state === "done") {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold tracking-tight">E-mail confirmado</h1>
        <p className="text-[13px] text-zinc-600">A partir de agora, use o novo e-mail para entrar.</p>
        <Link href="/alliance/login" className="text-[13px] text-zinc-900 underline-offset-4 hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Confirmar novo e-mail</h1>
      {state === "error" && <Alert tone="error">{message}</Alert>}
      <p className="text-[13px] text-zinc-600">Confirme para passar a usar este endereço no Alliance Hub.</p>
      <Button className="w-full" loading={state === "loading"} onClick={confirm}>
        Confirmar e-mail
      </Button>
    </div>
  );
}

export function ExpiredHubLink() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Link expirado</h1>
      <p className="text-[13px] text-zinc-600">Este link expirou ou já foi usado. Peça um novo para quem enviou o convite ou use &quot;Esqueci minha senha&quot;.</p>
      <Link href="/alliance/login" className="text-[13px] text-zinc-900 underline-offset-4 hover:underline">
        Ir para o login
      </Link>
    </div>
  );
}
