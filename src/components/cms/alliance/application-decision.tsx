"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Field, Input, Select, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { MODALITIES, MODALITY_KEYS, TIERS, TIER_KEYS } from "@/lib/alliance/constants";
import { cn } from "@/lib/utils";

type Mode = "approve" | "request_info" | "reject" | "note";

const MODES: { key: Mode; label: string; openOnly: boolean }[] = [
  { key: "approve", label: "Aprovar", openOnly: true },
  { key: "request_info", label: "Pedir informações", openOnly: true },
  { key: "reject", label: "Recusar", openOnly: true },
  { key: "note", label: "Anotar", openOnly: false },
];

/**
 * Decisão sobre a candidatura. Aprovar cria o parceiro (endereço, nível e modalidades) e manda o
 * e-mail de boas-vindas; recusar e pedir informações mandam a mensagem escrita aqui para a pessoa.
 */
export function ApplicationDecision({ id, open, suggestedSlug, modality }: { id: string; open: boolean; suggestedSlug: string; modality: string }) {
  const router = useRouter();
  const toast = useToast();
  const available = MODES.filter((m) => open || !m.openOnly);
  const [mode, setMode] = useState<Mode>(available[0].key);
  const [slug, setSlug] = useState(suggestedSlug);
  const [tier, setTier] = useState("member");
  const [modalities, setModalities] = useState<string[]>([modality]);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = mode === "approve" ? { action: mode, slug, tierKey: tier, modalities, message } : { action: mode, message };
      const result = await api<{ partnerId: string | null }>(`/api/cms/alliance/applications/${id}`, { body });
      if (mode === "approve" && result.partnerId) {
        toast.success("Candidatura aprovada. O parceiro foi criado.");
        router.push(`/cms/alliance/parceiros/${result.partnerId}`);
        return;
      }
      toast.success(mode === "note" ? "Anotação salva." : mode === "reject" ? "Candidatura recusada. A pessoa recebe o e-mail." : "Pedido enviado por e-mail.");
      setMessage("");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        toast.error(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-zinc-900">{open ? "Decisão" : "Anotações"}</h2>
        {!open && <p className="mt-0.5 text-[13px] text-zinc-500">Esta candidatura já foi decidida.</p>}
      </div>
      {available.length > 1 && (
        <div role="tablist" aria-label="Ação" className="flex flex-wrap gap-1 px-5 pt-4">
          {available.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={mode === m.key}
              onClick={() => setMode(m.key)}
              className={cn("rounded-md px-2.5 py-1 text-[13px] font-medium", mode === m.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100")}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="space-y-4 p-5">
        {mode === "approve" && (
          <>
            <Field label="Endereço da página" hint={`/partners/${slug || "..."}`} error={errors.slug}>
              {(p) => <Input {...p} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required maxLength={60} />}
            </Field>
            <Field label="Nível inicial" error={errors.tierKey}>
              {(p) => (
                <Select {...p} value={tier} onChange={(e) => setTier(e.target.value)}>
                  {TIER_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {TIERS[k].name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-zinc-900">Modalidades autorizadas</legend>
              <div className="space-y-1.5">
                {MODALITY_KEYS.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-zinc-300 accent-zinc-900"
                      checked={modalities.includes(k)}
                      onChange={(e) => setModalities((list) => (e.target.checked ? [...list, k] : list.filter((x) => x !== k)))}
                    />
                    {MODALITIES[k].name}
                  </label>
                ))}
              </div>
              {errors.modalities && <p className="mt-1.5 text-[13px] text-red-600">{errors.modalities}</p>}
            </fieldset>
          </>
        )}
        <Field
          label={mode === "approve" ? "Mensagem de boas-vindas" : mode === "reject" ? "Motivo (vai para a pessoa)" : mode === "request_info" ? "O que precisamos saber" : "Anotação interna"}
          optional={mode === "approve"}
          error={errors.message}
          hint={mode === "note" ? "Fica só no histórico, a pessoa não vê." : "Vai no e-mail para a pessoa."}
        >
          {(p) => <Textarea {...p} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required={mode !== "approve"} />}
        </Field>
        <Button type="submit" loading={busy} variant={mode === "reject" ? "danger" : "primary"} className="w-full">
          {mode === "approve" ? "Aprovar e criar parceiro" : mode === "reject" ? "Recusar candidatura" : mode === "request_info" ? "Enviar pedido" : "Salvar anotação"}
        </Button>
      </form>
    </section>
  );
}
