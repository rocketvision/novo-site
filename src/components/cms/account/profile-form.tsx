"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";

export function ProfileForm({ name: initialName, email, roleName }: { name: string; email: string; roleName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(initialName);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const dirty = name.trim() !== saved;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !dirty) return;
    setLoading(true);
    setError(undefined);
    try {
      await api("/api/cms/account", { method: "PATCH", body: { name } });
      setSaved(name.trim());
      setName(name.trim());
      toast.success("Nome atualizado.");
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      if (err.fields.name) setError(err.fields.name);
      else toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Nome" error={error}>
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />}
      </Field>
      <Field label="E-mail" hint="Para trocar o e-mail, peça a um administrador.">
        {(p) => <Input {...p} value={email} readOnly disabled />}
      </Field>
      <Field label="Função">{(p) => <Input {...p} value={roleName} readOnly disabled />}</Field>
      <div className="flex justify-end">
        <Button type="submit" loading={loading} disabled={!dirty}>
          Salvar nome
        </Button>
      </div>
    </form>
  );
}
