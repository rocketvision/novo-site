"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/cms/ui/button";
import { Field, Input } from "@/components/cms/ui/field";
import { api, ApiError } from "@/lib/cms/api";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setFieldError(undefined);
    try {
      const { message } = await api<{ message: string }>("/api/cms/auth/password-reset/request", { body: { email } });
      setSent(message);
    } catch (e) {
      const err = e as ApiError;
      if (err.fields?.email) setFieldError(err.fields.email);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold tracking-tight">Verifique seu e-mail</h1>
        <p role="status" className="text-[13px] text-zinc-600">{sent}</p>
        <Link href="/cms/login" className="text-[13px] text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Redefinir senha</h1>
        <p className="mt-1 text-[13px] text-zinc-500">Enviaremos um link para criar uma senha nova.</p>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}
      <Field label="E-mail" error={fieldError}>
        {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        Enviar link
      </Button>
      <p className="text-center text-[13px]">
        <Link href="/cms/login" className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
