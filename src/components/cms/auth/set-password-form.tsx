"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input } from "@/components/cms/ui/field";
import { api, ApiError } from "@/lib/cms/api";

export function SetPasswordForm({
  token,
  endpoint,
  title,
  description,
  submitLabel,
}: {
  token: string;
  endpoint: string;
  title: string;
  description: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (password !== confirm) {
      setErrors({ confirm: "As senhas não conferem." });
      return;
    }
    setLoading(true);
    setErrors({});
    setError(null);
    try {
      const { redirect } = await api<{ redirect: string }>(endpoint, { body: { token, password } });
      router.replace(redirect);
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.fields ?? {});
      if (!err.fields?.password) setError(err.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-[13px] text-zinc-500">{description}</p>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}
      <Field label="Nova senha" hint="Pelo menos 12 caracteres. Uma frase fácil de lembrar funciona bem." error={errors.password}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />}
      </Field>
      <Field label="Confirme a senha" error={errors.confirm}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
