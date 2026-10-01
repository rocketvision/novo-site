"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { relativeTime } from "@/lib/cms/format";

type Request = { id: string; partnerId: string; partnerName: string; changes: unknown; requestedByName: string | null; createdAt: string };

const LABELS: Record<string, string> = {
  tradeName: "Nome comercial",
  shortDescription: "Descrição curta",
  description: "Descrição completa",
  websiteUrl: "Site",
  location: "Localização",
  specialties: "Especialidades",
  services: "Serviços",
  socialLinks: "Redes sociais",
  logoMediaId: "Logotipo",
};

function show(value: unknown) {
  if (Array.isArray(value)) return value.map((v) => (typeof v === "object" && v ? `${(v as { label?: string }).label}: ${(v as { url?: string }).url}` : String(v))).join(" · ") || "(vazio)";
  if (value === null || value === "") return "(vazio)";
  return String(value);
}

/** Pedidos de alteração de dados públicos feitos pelas empresas no Hub: ver o que mudaria e decidir. */
export function ChangeRequestList({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id + action);
    try {
      await api(`/api/cms/alliance/change-requests/${id}`, { body: { action, note: notes[id] ?? "" } });
      toast.success(action === "approve" ? "Alterações aprovadas e aplicadas." : "Pedido recusado.");
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="-my-2 divide-y divide-zinc-100">
      {requests.map((r) => (
        <li key={r.id} className="py-4">
          <p className="text-sm">
            <Link href={`/cms/alliance/parceiros/${r.partnerId}`} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
              {r.partnerName}
            </Link>{" "}
            <span className="text-zinc-500">
              · {r.requestedByName ?? "Hub"} · {relativeTime(r.createdAt)}
            </span>
          </p>
          <dl className="mt-2 space-y-1 text-[13px]">
            {Object.entries((r.changes ?? {}) as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                <dt className="text-zinc-500">{LABELS[k] ?? k}</dt>
                <dd className="break-words text-zinc-800">{k === "logoMediaId" ? (v ? "Novo logotipo enviado" : "Remover logotipo") : show(v)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input aria-label="Observação para a empresa" placeholder="Observação para a empresa (opcional)" value={notes[r.id] ?? ""} maxLength={1000} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="secondary" loading={busy === r.id + "reject"} disabled={busy !== null} onClick={() => decide(r.id, "reject")}>
                Recusar
              </Button>
              <Button size="sm" loading={busy === r.id + "approve"} disabled={busy !== null} onClick={() => decide(r.id, "approve")}>
                Aprovar
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
