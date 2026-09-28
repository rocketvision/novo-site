"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input } from "@/components/cms/ui/field";
import { api, ApiError } from "@/lib/cms/api";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setFields({});
    try {
      const { redirect } = await api<{ redirect: string }>("/api/cms/auth/login", { body: { email, password, next } });
      router.replace(redirect);
      router.refresh();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, "unknown", "Não foi possível entrar.");
      setError(err.status === 422 ? null : err.message);
      setFields(err.fields);
      setPassword("");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Entrar</h1>
      {notice && !error && (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}
      <Field label="E-mail" error={fields.email}>
        {(p) => <Input {...p} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
      </Field>
      <Field label="Senha" error={fields.password}>
        {(p) => (
          <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        Entrar
      </Button>
      <p className="text-center text-[13px]">
        <Link href="/cms/esqueci-senha" className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
