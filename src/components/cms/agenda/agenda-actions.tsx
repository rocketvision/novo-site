"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";

/** Botão com confirmação que chama uma rota do CMS e atualiza a página. */
function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  path,
  method,
  done,
  variant = "secondary",
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  path: string;
  method: "POST" | "DELETE";
  done: string;
  variant?: "secondary" | "ghost" | "danger";
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        loading={loading}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setLoading(true);
          try {
            await api(path, { method });
            toast.success(done);
            setOpen(false);
            router.refresh();
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Não foi possível concluir.");
          } finally {
            setLoading(false);
          }
        }}
      />
    </>
  );
}

export function CancelBookingButton({ id, who }: { id: string; who: string }) {
  return (
    <ConfirmAction
      label="Cancelar"
      title={`Cancelar a call com ${who}?`}
      description="O evento sai do Google Calendar (quem tiver recebido convite é avisado) e o horário volta a ficar livre no site."
      confirmLabel="Cancelar a call"
      path={`/api/cms/agenda/bookings/${id}/cancel`}
      method="POST"
      done="Call cancelada."
      variant="ghost"
    />
  );
}

export function DisconnectGoogleButton({ email }: { email: string }) {
  return (
    <ConfirmAction
      label="Desconectar"
      title="Desconectar o Google Calendar?"
      description={`O site deixa de oferecer horários e de criar calls na agenda ${email}. As calls já marcadas continuam no Google.`}
      confirmLabel="Desconectar"
      path="/api/cms/google"
      method="DELETE"
      done="Google Calendar desconectado."
    />
  );
}
