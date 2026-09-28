"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";

const empty = { currentPassword: "", newPassword: "", confirm: "" };

export function PasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    const local: Record<string, string> = {};
    if (!values.currentPassword) local.currentPassword = "Informe a senha atual.";
    if (!values.newPassword) local.newPassword = "Informe a nova senha.";
    else if (values.newPassword !== values.confirm) local.confirm = "As senhas não conferem.";
    if (Object.keys(local).length) return setErrors(local);

    setLoading(true);
    setErrors({});
    try {
      await api("/api/cms/account/password", { body: { currentPassword: values.currentPassword, newPassword: values.newPassword } });
      setValues(empty);
      toast.success("Senha alterada. As outras sessões foram encerradas.");
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      if (Object.keys(err.fields).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Senha atual" error={errors.currentPassword}>
        {(p) => <Input {...p} type="password" autoComplete="current-password" value={values.currentPassword} onChange={set("currentPassword")} />}
      </Field>
      <Field label="Nova senha" hint="Pelo menos 12 caracteres. Uma frase fácil de lembrar funciona bem." error={errors.newPassword}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={values.newPassword} onChange={set("newPassword")} />}
      </Field>
      <Field label="Confirme a nova senha" error={errors.confirm}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={values.confirm} onChange={set("confirm")} />}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Alterar senha
        </Button>
      </div>
    </form>
  );
}
