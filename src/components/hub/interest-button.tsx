"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";

export function InterestButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await api(`/api/alliance/hub/opportunities/${id}/interest`, { body: { message } });
      toast.success("Interesse enviado. A equipe Rocket Vision vai responder.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Tenho interesse
      </Button>
      <ConfirmDialog open={open} tone="primary" title={title} description="Conte por que a sua empresa é uma boa escolha para esta oportunidade." confirmLabel="Enviar interesse" loading={busy} onConfirm={send} onClose={() => setOpen(false)}>
        <Field label="Mensagem" optional>
          {(p) => <Textarea {...p} rows={4} value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
      </ConfirmDialog>
    </>
  );
}
