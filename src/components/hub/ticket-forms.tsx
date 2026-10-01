"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input, Select, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { TICKET_CATEGORIES } from "@/lib/alliance/constants";

export function NewTicketForm() {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ subject: "", category: "referral", body: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ id: string; code: string }>("/api/alliance/hub/support", { body: v });
      toast.success(`Chamado ${r.code} aberto.`);
      router.push(`/alliance/suporte/${r.id}`);
    } catch (err) {
      setErrors((err as ApiError).fields ?? {});
      toast.error((err as ApiError).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5">
      <Field label="Assunto" error={errors.subject}>
        {(p) => <Input {...p} value={v.subject} maxLength={120} required onChange={(e) => setV({ ...v, subject: e.target.value })} />}
      </Field>
      <Field label="Categoria" error={errors.category}>
        {(p) => (
          <Select {...p} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Mensagem" error={errors.body} counter={{ value: v.body.length, max: 4000 }}>
        {(p) => <Textarea {...p} rows={6} value={v.body} maxLength={4000} required onChange={(e) => setV({ ...v, body: e.target.value })} />}
      </Field>
      <Button type="submit" loading={busy}>
        Abrir chamado
      </Button>
    </form>
  );
}

export function TicketReply({ id, closed }: { id: string; closed: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<null | "send" | "close">(null);
  async function send(close: boolean) {
    setBusy(close ? "close" : "send");
    try {
      await api(`/api/alliance/hub/support/${id}`, { body: { body: body || "Chamado encerrado.", close } });
      setBody("");
      toast.success(close ? "Chamado encerrado." : "Mensagem enviada.");
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <Field label={closed ? "Reabrir com uma nova mensagem" : "Responder"}>
        {(p) => <Textarea {...p} rows={4} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => send(false)} loading={busy === "send"} disabled={!body.trim()}>
          Enviar
        </Button>
        {!closed && (
          <Button size="sm" variant="ghost" onClick={() => send(true)} loading={busy === "close"}>
            Encerrar chamado
          </Button>
        )}
      </div>
    </div>
  );
}
