"use client";

import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cta } from "@/content/landing";
import { validateContact, type ContactErrors, type ContactPayload } from "@/lib/contact";
import { site } from "@/lib/site";
import { transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent" | "error";

const empty: ContactPayload = { name: "", company: "", email: "", phone: "", interests: [], message: "" };

export function ContactForm() {
  const [data, setData] = useState<ContactPayload>(empty);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const id = useId();

  const update = <K extends keyof ContactPayload>(key: K, value: ContactPayload[K]) => {
    setData((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const toggleInterest = (interest: string) => {
    update(
      "interests",
      data.interests.includes(interest) ? data.interests.filter((i) => i !== interest) : [...data.interests, interest],
    );
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateContact(data);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }

    setStatus("sending");
    try {
      const website = (event.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value;
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, website }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setStatus("sent");
      setData(empty);
    } catch {
      setStatus("error");
    }
  }

  const { email, whatsapp } = site.contact;

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {status === "sent" ? (
          <m.div
            key="sent"
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={transition.reveal}
            className="flex min-h-[28rem] flex-col items-start justify-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-ink">
              <Check className="size-6" strokeWidth={2.25} />
            </span>
            <p className="text-title mt-8 text-white">Recebemos sua mensagem.</p>
            <p className="text-body mt-3 max-w-md text-white/60">
              Obrigado por contar sobre o seu projeto. Nosso time vai ler com atenção e responder pelo contato que você informou.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="link-underline mt-8 text-sm text-white/70 hover:text-white"
            >
              Enviar outra mensagem
            </button>
          </m.div>
        ) : (
          <m.form
            key="form"
            noValidate
            onSubmit={onSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.reveal}
            className="space-y-6"
            aria-describedby={status === "error" ? `${id}-error` : undefined}
          >
            <fieldset>
              <legend className="text-sm font-medium text-white">O que você precisa?</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {cta.interests.map((interest) => {
                  const checked = data.interests.includes(interest);
                  return (
                    <label
                      key={interest}
                      className={cn(
                        "cursor-pointer rounded-full px-4 py-2 text-sm ring-1 transition-[background-color,color,box-shadow] duration-300 ease-out ring-inset has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                        checked ? "bg-white text-ink ring-white" : "text-white/70 ring-white/15 hover:text-white hover:ring-white/35",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleInterest(interest)}
                      />
                      {interest}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field id={`${id}-name`} label="Nome" error={errors.name} required>
                <input
                  id={`${id}-name`}
                  name="name"
                  autoComplete="name"
                  value={data.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={inputClass(!!errors.name)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? `${id}-name-error` : undefined}
                  required
                />
              </Field>
              <Field id={`${id}-company`} label="Empresa">
                <input
                  id={`${id}-company`}
                  name="company"
                  autoComplete="organization"
                  value={data.company}
                  onChange={(e) => update("company", e.target.value)}
                  className={inputClass(false)}
                />
              </Field>
              <Field id={`${id}-email`} label="E-mail" error={errors.email} required>
                <input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={data.email}
                  onChange={(e) => update("email", e.target.value)}
                  className={inputClass(!!errors.email)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? `${id}-email-error` : undefined}
                  required
                />
              </Field>
              <Field id={`${id}-phone`} label="WhatsApp ou telefone">
                <input
                  id={`${id}-phone`}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={data.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className={inputClass(false)}
                />
              </Field>
            </div>

            <Field id={`${id}-message`} label="Conte sobre o projeto" error={errors.message} required>
              <textarea
                id={`${id}-message`}
                name="message"
                rows={4}
                value={data.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Qual problema você quer resolver? Tem algum prazo ou referência?"
                className={cn(inputClass(!!errors.message), "min-h-32 resize-y py-3.5")}
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? `${id}-message-error` : undefined}
                required
              />
            </Field>

            {/* Honeypot contra spam. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Não preencha
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            {status === "error" && (
              <p id={`${id}-error`} role="alert" className="rounded-2xl bg-white/[0.06] px-5 py-4 text-sm text-white/80">
                Não conseguimos enviar agora.{" "}
                {email || whatsapp ? (
                  <>
                    Fale direto com a gente
                    {whatsapp && (
                      <>
                        {" "}pelo{" "}
                        <a className="underline underline-offset-4" href={`https://wa.me/${whatsapp}`}>
                          WhatsApp
                        </a>
                      </>
                    )}
                    {email && (
                      <>
                        {whatsapp ? " ou" : ""} pelo e-mail{" "}
                        <a className="underline underline-offset-4" href={`mailto:${email}`}>
                          {email}
                        </a>
                      </>
                    )}
                    .
                  </>
                ) : (
                  "Tente novamente em alguns instantes."
                )}
              </p>
            )}

            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={status === "sending"}
                className={buttonClasses({ variant: "inverse", size: "lg", className: "w-full sm:w-auto" })}
              >
                <span>{status === "sending" ? "Enviando..." : cta.submit}</span>
                {status === "sending" ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <ArrowRight aria-hidden="true" className="-mr-1 size-4 transition-transform duration-300 group-hover/button:translate-x-0.5" />
                )}
              </button>
              {cta.reassurance && <p className="text-center text-sm text-white/55 sm:text-left">{cta.reassurance}</p>}
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function inputClass(invalid: boolean) {
  return cn(
    "block w-full rounded-xl bg-white/[0.05] px-4 py-3 text-[1rem] text-white placeholder:text-white/40 ring-1 ring-inset transition-[box-shadow,background-color] duration-300 ease-out outline-none",
    "hover:bg-white/[0.07] focus:bg-white/[0.08] focus:ring-2 focus:ring-white/70",
    invalid ? "ring-accent" : "ring-white/10",
  );
}

function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-white/70">
        {label}
        {required && <span className="text-white/50"> (obrigatório)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-accent-soft">
          {error}
        </p>
      )}
    </div>
  );
}
