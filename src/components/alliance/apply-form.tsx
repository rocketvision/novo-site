"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { maskPhone } from "@/lib/diagnostic";
import { MODALITY_KEYS, SECTORS } from "@/lib/alliance/constants";
import { applicationSchema } from "@/lib/alliance/validation";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

const BLUE = "#2c9df5";

type Values = {
  name: string;
  company: string;
  email: string;
  website: string;
  phone: string;
  sector: string;
  modality: string;
  companyDescription: string;
  interest: string;
  consentPrivacy: boolean;
  consentMarketing: boolean;
  fax: string;
};

const EMPTY: Values = { name: "", company: "", email: "", website: "", phone: "", sector: "", modality: "", companyDescription: "", interest: "", consentPrivacy: false, consentMarketing: false, fax: "" };

/**
 * Candidatura ao Rocket Alliance. Validação no navegador (para o erro aparecer na hora) e, a que vale,
 * no servidor. Campo invisível contra robôs. A candidatura entra como Pending Review.
 */
export function ApplyForm({ modalities }: { modalities: { key: string; name: string; description: string }[] }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  };

  function focusFirstError(fields: Record<string, string>) {
    const first = Object.keys(fields)[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const { fax, ...data } = values;
    const parsed = applicationSchema.safeParse(data);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
      setErrors(fields);
      focusFirstError(fields);
      return;
    }
    setState("sending");
    try {
      const response = await fetch("/api/alliance/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, fax }) });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const fields = body?.error?.fields ?? {};
        setErrors(fields);
        focusFirstError(fields);
        setFormError(response.status === 429 ? "Muitas tentativas. Aguarde alguns minutos e tente de novo." : (body?.error?.message ?? "Não foi possível enviar agora. Tente de novo em instantes."));
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setFormError("Sem conexão. Verifique a internet e tente de novo.");
      setState("idle");
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {state === "done" ? (
          <m.div key="done" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: ease.out }} className="flex flex-col items-center px-4 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-full ring-1 ring-white/15" style={{ background: "rgb(44 157 245 / 0.12)" }}>
              <Check className="size-6" style={{ color: BLUE }} aria-hidden="true" />
            </span>
            <h3 className="mt-6 text-[1.75rem] leading-tight font-semibold tracking-[-0.03em]">Candidatura recebida.</h3>
            <p className="mt-3 max-w-[28rem] text-[0.95rem] leading-relaxed text-white/60">
              Obrigado pelo interesse no Rocket Alliance. A sua candidatura está em análise (Pending Review) e a resposta chega pelo e-mail informado.
            </p>
            <p className="mt-6 font-serif text-[1.25rem] text-white/80 italic">Grow Together. Go Beyond.</p>
          </m.div>
        ) : (
          <m.form key="form" ref={formRef} onSubmit={submit} noValidate initial={false} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4, ease: ease.out }} className="space-y-6" aria-describedby={formError ? "apply-error" : undefined}>
            {/* Honeypot: invisível para pessoas, preenchido por robôs. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Fax
                <input tabIndex={-1} autoComplete="off" name="fax" value={values.fax} onChange={(e) => set("fax", e.target.value)} />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Seu nome" name="name" autoComplete="name" value={values.name} error={errors.name} onChange={(v) => set("name", v)} maxLength={80} />
              <TextField label="Empresa" name="company" autoComplete="organization" value={values.company} error={errors.company} onChange={(v) => set("company", v)} maxLength={120} />
              <TextField label="E-mail" name="email" type="email" autoComplete="email" value={values.email} error={errors.email} onChange={(v) => set("email", v)} maxLength={160} />
              <TextField label="Telefone ou WhatsApp" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={values.phone} error={errors.phone} onChange={(v) => set("phone", maskPhone(v))} maxLength={16} placeholder="(00) 00000-0000" />
              <TextField label="Site" name="website" autoComplete="url" inputMode="url" value={values.website} error={errors.website} onChange={(v) => set("website", v)} maxLength={300} placeholder="empresa.com.br" optional />
              <SelectField label="Área de atuação" name="sector" value={values.sector} error={errors.sector} onChange={(v) => set("sector", v)} options={SECTORS.map((s) => ({ value: s, label: s }))} />
            </div>

            <fieldset>
              <legend className="mb-3 text-[0.8125rem] font-medium text-white/80">Modalidade desejada</legend>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-invalid={errors.modality ? true : undefined} aria-describedby={errors.modality ? "modality-error" : undefined}>
                {MODALITY_KEYS.map((key) => {
                  const mod = modalities.find((x) => x.key === key);
                  if (!mod) return null;
                  const checked = values.modality === key;
                  return (
                    <label key={key} className={cn("relative flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 transition-colors", checked ? "bg-white/[0.06] ring-white/40" : "ring-white/12 hover:ring-white/25")}>
                      <input type="radio" name="modality" value={key} checked={checked} onChange={() => set("modality", key)} className="sr-only" />
                      <span aria-hidden="true" className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ring-1", checked ? "ring-transparent" : "ring-white/30")} style={checked ? { background: BLUE } : undefined}>
                        {checked && <span className="size-1.5 rounded-full bg-white" />}
                      </span>
                      <span>
                        <span className="block text-[0.9rem] font-medium text-white">{mod.name}</span>
                        <span className="mt-1 line-clamp-2 text-[0.75rem] leading-snug text-white/45">{mod.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.modality && (
                <p id="modality-error" className="mt-2 text-[0.8125rem] text-[#ff8a7a]">
                  {errors.modality}
                </p>
              )}
            </fieldset>

            <AreaField label="Sobre a empresa" name="companyDescription" value={values.companyDescription} error={errors.companyDescription} onChange={(v) => set("companyDescription", v)} max={1200} hint="O que a empresa faz, para quem e há quanto tempo." />
            <AreaField label="Interesse na parceria" name="interest" value={values.interest} error={errors.interest} onChange={(v) => set("interest", v)} max={1200} hint="Como você imagina crescer junto com a Rocket Vision." />

            <div className="space-y-3">
              <Check2 name="consentPrivacy" checked={values.consentPrivacy} error={errors.consentPrivacy} onChange={(v) => set("consentPrivacy", v)}>
                Autorizo a Rocket Vision a tratar estes dados para avaliar a candidatura e entrar em contato, conforme a LGPD.
              </Check2>
              <Check2 name="consentMarketing" checked={values.consentMarketing} onChange={(v) => set("consentMarketing", v)}>
                Quero receber novidades e comunicações do Rocket Alliance. <span className="text-white/40">Opcional.</span>
              </Check2>
            </div>

            {formError && (
              <p id="apply-error" role="alert" className="rounded-2xl bg-[#ff5b1f]/10 px-4 py-3 text-[0.875rem] text-[#ffb59c] ring-1 ring-[#ff5b1f]/25">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={state === "sending"}
              className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#f6f7f9_0%,#d3d7de_55%,#b9bec7_100%)] px-7 text-[1rem] font-semibold text-[#0b0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.18),0_10px_30px_-12px_rgba(0,0,0,0.8)] transition-[transform,box-shadow,opacity] duration-300 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_40px_-10px_rgb(44_157_245/0.55)] disabled:opacity-70 sm:w-auto"
            >
              {state === "sending" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              {state === "sending" ? "Enviando..." : "Enviar candidatura"}
              {state !== "sending" && <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />}
            </button>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputBase =
  "w-full rounded-2xl border bg-white/[0.03] px-4 text-[0.95rem] text-white placeholder:text-white/30 transition-colors outline-none hover:border-white/25 focus:border-white/50 focus:bg-white/[0.05]";

function Label({ id, label, optional }: { id: string; label: string; optional?: boolean }) {
  return (
    <label htmlFor={id} className="mb-2 block text-[0.8125rem] font-medium text-white/80">
      {label}
      {optional && <span className="ml-1.5 font-normal text-white/40">Opcional</span>}
    </label>
  );
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="mt-2 text-[0.8125rem] text-[#ff8a7a]">
      {error}
    </p>
  ) : null;
}

function TextField({ label, name, value, error, onChange, optional, ...rest }: { label: string; name: string; value: string; error?: string; onChange: (v: string) => void; optional?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "name">) {
  const id = useId();
  return (
    <div>
      <Label id={id} label={label} optional={optional} />
      <input id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} className={cn(inputBase, "h-12", error ? "border-[#ff8a7a]/60" : "border-white/12")} {...rest} />
      <ErrorText id={`${id}-e`} error={error} />
    </div>
  );
}

function SelectField({ label, name, value, error, onChange, options }: { label: string; name: string; value: string; error?: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div>
      <Label id={id} label={label} />
      <div className="relative">
        <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} className={cn(inputBase, "h-12 appearance-none bg-[#0d0e11] pr-10", error ? "border-[#ff8a7a]/60" : "border-white/12", !value && "text-white/40")}>
          <option value="">Escolha</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      <ErrorText id={`${id}-e`} error={error} />
    </div>
  );
}

function AreaField({ label, name, value, error, onChange, max, hint }: { label: string; name: string; value: string; error?: string; onChange: (v: string) => void; max: number; hint?: string }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Label id={id} label={label} />
        <span className={cn("text-[0.7rem] tabular-nums", value.length > max ? "text-[#ff8a7a]" : "text-white/30")}>
          {value.length}/{max}
        </span>
      </div>
      <textarea id={id} name={name} rows={4} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={`${id}-h${error ? ` ${id}-e` : ""}`} className={cn(inputBase, "resize-y py-3.5 leading-relaxed", error ? "border-[#ff8a7a]/60" : "border-white/12")} />
      {hint && !error && (
        <p id={`${id}-h`} className="mt-2 text-[0.75rem] text-white/40">
          {hint}
        </p>
      )}
      <ErrorText id={`${id}-e`} error={error} />
    </div>
  );
}

function Check2({ name, checked, onChange, error, children }: { name: string; checked: boolean; onChange: (v: boolean) => void; error?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[0.8125rem] leading-relaxed text-white/70">
        <input id={id} name={name} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} className="mt-0.5 size-4 shrink-0 rounded accent-[#2c9df5]" />
        <span>{children}</span>
      </label>
      <ErrorText id={`${id}-e`} error={error} />
    </div>
  );
}
