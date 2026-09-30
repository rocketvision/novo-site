"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { isValidPhone, maskPhone, phoneDigits, PRESENCE, PROBLEMS, SEGMENTS, summarize, TIMING } from "@/lib/diagnostic";
import { cn } from "@/lib/utils";

/**
 * Diagnóstico: o quiz em tela cheia que substitui o formulário de contato, no modelo do da UKP
 * Digital (parceira da Rocket, com autorização). Sete perguntas, uma por vez, no ritmo de uma conversa:
 * nome, negócio, segmento, presença na internet, problemas, prazo e WhatsApp. Letras e Enter
 * respondem pelo teclado. No fim, o diagnóstico vai para /api/diagnostico e a tela convida para a call.
 *
 * Abre por `useDiagnostic().open()` ou por qualquer link para "#diagnostico" ou "#contato" (os CTAs
 * do site inteiro, inclusive os que vêm do CMS), sem precisar mudar cada um.
 */

type Answers = { name: string; business: string; segment: string; presence: string; problems: string[]; timing: string; whatsapp: string };
const EMPTY: Answers = { name: "", business: "", segment: "", presence: "", problems: [], timing: "", whatsapp: "" };
const TOTAL = 7;
const LETTERS = "ABCDEFGH";
const BLUE = "#2c9df5";

const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useDiagnostic = () => useContext(Ctx);

/** Link para abrir o diagnóstico (qualquer href terminado em #diagnostico ou #contato abre o quiz). */
export const DIAGNOSTIC_HREF = "#diagnostico";

export function DiagnosticProvider({ whatsapp, children }: { whatsapp?: string; children: React.ReactNode }) {
  const [openState, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);

  // Todos os caminhos para o antigo formulário passam a abrir o diagnóstico.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = (event.target as Element | null)?.closest?.("a[href], [data-diagnostico]");
      if (!target) return;
      const href = target.getAttribute("href") ?? "";
      if (!target.hasAttribute("data-diagnostico") && !/#(diagnostico|contato)$/.test(href)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };
    window.addEventListener("click", onClick, true);
    // Link direto (…/#diagnostico) abre o quiz assim que a página carrega.
    const direct = window.location.hash === DIAGNOSTIC_HREF ? window.setTimeout(() => setOpen(true), 0) : 0;
    return () => {
      window.clearTimeout(direct);
      window.removeEventListener("click", onClick, true);
    };
  }, []);

  const value = useMemo(() => ({ open }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <AnimatePresence>{openState && <Quiz key="quiz" whatsapp={whatsapp} onClose={() => setOpen(false)} />}</AnimatePresence>
    </Ctx.Provider>
  );
}

type Status = "idle" | "sending" | "done" | "error";

function Quiz({ whatsapp, onClose }: { whatsapp?: string; onClose: () => void }) {
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [status, setStatus] = useState<Status>("idle");
  const [honeypot, setHoneypot] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const first = answers.name.trim().split(/\s+/)[0] ?? "";
  const business = answers.business.trim();

  // Trava a página por baixo (o Lenis para junto) e devolve o foco ao fechar.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  const valid = (s: number) => {
    if (s === 1) return answers.name.trim().length >= 2;
    if (s === 2) return business.length >= 2;
    if (s === 3) return Boolean(answers.segment);
    if (s === 4) return Boolean(answers.presence);
    if (s === 5) return answers.problems.length > 0;
    if (s === 6) return Boolean(answers.timing);
    if (s === 7) return isValidPhone(answers.whatsapp);
    return true;
  };

  const submit = useCallback(async () => {
    setStatus("sending");
    setStep(8);
    try {
      const response = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, name: answers.name.trim(), business, source: pathname, website: honeypot }),
      });
      setStatus(response.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }, [answers, business, pathname, honeypot]);

  const next = useCallback(() => {
    if (!valid(step)) return;
    if (step === TOTAL) void submit();
    else setStep((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, answers, submit]);
  const back = () => setStep((s) => Math.max(1, s - 1));

  /** Escolha única: marca e avança sozinho, depois de um instante para a marcação aparecer. */
  const choose = (key: "segment" | "presence" | "timing", value: string) => {
    set(key, value);
    window.setTimeout(() => setStep((s) => s + 1), 320);
  };
  const toggle = (value: string) => set("problems", answers.problems.includes(value) ? answers.problems.filter((p) => p !== value) : [...answers.problems, value]);

  // Teclado: Esc fecha, Enter confirma, letras escolhem as opções.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return onClose();
      if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        if (step === 0) setStep(1);
        else if (step >= 1 && step <= TOTAL) next();
        return;
      }
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = LETTERS.indexOf(event.key.toUpperCase());
      if (index < 0) return;
      if (step === 3 && SEGMENTS[index]) choose("segment", SEGMENTS[index]);
      if (step === 4 && PRESENCE[index]) choose("presence", PRESENCE[index]);
      if (step === 5 && PROBLEMS[index]) toggle(PROBLEMS[index]);
      if (step === 6 && TIMING[index]) choose("timing", TIMING[index]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, next, onClose, answers]);

  const talk = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Sou ${first} da ${business}. Acabei de fazer o diagnóstico no site e quero agendar uma call.\n\n*Minhas respostas*\n${summarize(answers)}`,
      )}`
    : null;

  return (
    <m.div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Diagnóstico do seu negócio"
      className="fixed inset-0 z-[90] overflow-y-auto bg-[#050507] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      data-lenis-prevent
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_55%_at_50%_0%,rgb(44_157_245/0.16),transparent_70%),radial-gradient(80%_80%_at_50%_120%,rgb(255_255_255/0.04),transparent_60%)]" />

      <header className="relative flex items-center justify-between px-6 pt-5 sm:px-10">
        <LogoMark animated className="size-8 text-white" />
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 text-[0.8125rem] text-white/80 transition-colors hover:border-white/30 hover:text-white">
          Voltar pro site
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </header>

      <div className="relative mx-auto w-full max-w-[42rem] px-6 pt-10 pb-16 sm:pt-12">
        <div className="flex items-center gap-4" aria-hidden="true">
          <span className="font-mono text-[0.6875rem] text-white/45 tabular-nums">
            {String(Math.min(step, TOTAL)).padStart(2, "0")}/{String(TOTAL).padStart(2, "0")}
          </span>
          <span className="relative h-px flex-1 bg-white/10">
            <span className="absolute inset-y-0 left-0 bg-white/60 transition-[width] duration-500 ease-out" style={{ width: `${(Math.min(step, TOTAL) / TOTAL) * 100}%` }} />
          </span>
        </div>

        <div className="flex min-h-[calc(100svh-12rem)] items-center">
          <AnimatePresence mode="wait">
            <m.div
              key={step}
              className="w-full"
              initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <div className="text-center">
                  <h2 className="mx-auto max-w-[12ch] text-[clamp(2.4rem,5.4vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance">Desenvolvemos o diagnóstico do problema do seu negócio</h2>
                  <p className="mx-auto mt-6 max-w-[46ch] text-[1rem] leading-relaxed text-pretty text-white/60">
                    1 minuto de perguntas pra entendermos o seu negócio, seu mercado e seu problema. No fim, trazemos a leitura completa do seu cenário e os próximos passos.
                  </p>
                  <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                    <button type="button" autoFocus onClick={() => setStep(1)} className={SILVER_BUTTON}>
                      Começar o diagnóstico
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={onClose} className="inline-flex h-12 items-center rounded-full border border-white/15 px-6 text-[0.9375rem] text-white/85 transition-colors hover:border-white/35 hover:text-white">
                      Voltar pro site
                    </button>
                  </div>
                  <p className="mt-6 font-mono text-[0.6875rem] text-white/35">( leva 1 minuto )</p>
                </div>
              )}

              {step === 1 && (
                <TextStep title="Antes de tudo: como a gente te chama?" placeholder="Seu nome" value={answers.name} onChange={(v) => set("name", v)} autoComplete="given-name" canGo={valid(1)} onOk={next} />
              )}
              {step === 2 && (
                <TextStep
                  title={`Prazer, ${first}. E o seu negócio, qual é o nome?`}
                  placeholder="Nome do seu negócio"
                  value={answers.business}
                  onChange={(v) => set("business", v)}
                  autoComplete="organization"
                  canGo={valid(2)}
                  onOk={next}
                  onBack={back}
                />
              )}
              {step === 3 && <ChoiceStep title={`O que a ${business} faz?`} options={SEGMENTS} selected={[answers.segment]} onPick={(v) => choose("segment", v)} onBack={back} />}
              {step === 4 && <ChoiceStep title={`E hoje, como a ${business} aparece na internet?`} options={PRESENCE} selected={[answers.presence]} onPick={(v) => choose("presence", v)} onBack={back} />}
              {step === 5 && (
                <ChoiceStep title="Quais problemas você enxerga hoje na sua empresa?" hint="Pode marcar mais de uma opção." options={PROBLEMS} selected={answers.problems} onPick={toggle} multiple canGo={valid(5)} onOk={next} onBack={back} />
              )}
              {step === 6 && <ChoiceStep title="E pra quando você precisa disso?" options={TIMING} selected={[answers.timing]} onPick={(v) => choose("timing", v)} onBack={back} />}
              {step === 7 && (
                <TextStep
                  title={`Fechou, ${first}. Pra onde mandamos o diagnóstico?`}
                  hint="Seu WhatsApp. Sem spam e sem ligação de vendas, prometo."
                  placeholder="(00) 00000-0000"
                  value={answers.whatsapp}
                  onChange={(v) => set("whatsapp", maskPhone(v))}
                  inputMode="tel"
                  autoComplete="tel-national"
                  canGo={valid(7)}
                  onOk={next}
                  onBack={back}
                  extra={
                    // Campo invisível para bots.
                    <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="absolute -left-[9999px] h-px w-px opacity-0" name="website" />
                  }
                />
              )}

              {step === 8 && status === "sending" && <p className="text-center font-mono text-[0.75rem] text-white/50">( enviando o seu diagnóstico )</p>}
              {step === 8 && status === "done" && (
                <div className="text-center">
                  <h2 className="text-[clamp(2.4rem,5.4vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.045em]">Recebido, {first}!</h2>
                  <p className="mx-auto mt-6 max-w-[46ch] text-[1rem] leading-relaxed text-pretty text-white/60">
                    Já temos o cenário da {business} aqui. O melhor jeito de te entregar o diagnóstico é numa call de 15 minutos: a gente entende seu negócio de perto e te mostra o plano.
                  </p>
                  <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                    {talk ? (
                      <a href={talk} target="_blank" rel="noreferrer" className={SILVER_BUTTON}>
                        Agendar minha call
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <p className="w-full text-[0.9375rem] text-white/75">
                        A Rocket vai te chamar no WhatsApp <span className="text-white tabular-nums">{maskPhone(phoneDigits(answers.whatsapp))}</span> pra marcar a call.
                      </p>
                    )}
                    <button type="button" onClick={onClose} className="inline-flex h-12 items-center rounded-full border border-white/15 px-6 text-[0.9375rem] text-white/85 transition-colors hover:border-white/35 hover:text-white">
                      Voltar pro site
                    </button>
                  </div>
                </div>
              )}
              {step === 8 && status === "error" && (
                <div className="text-center">
                  <h2 className="text-[clamp(2rem,4.6vw,3rem)] leading-[1.05] font-semibold tracking-[-0.04em]">Não conseguimos enviar agora.</h2>
                  <p className="mx-auto mt-5 max-w-[44ch] text-[1rem] leading-relaxed text-white/60">Suas respostas continuam aqui. Tente de novo em instantes.</p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <button type="button" onClick={() => void submit()} className={SILVER_BUTTON}>
                      Tentar de novo
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => setStep(TOTAL)} className="inline-flex h-12 items-center rounded-full border border-white/15 px-6 text-[0.9375rem] text-white/85 hover:border-white/35">
                      Revisar respostas
                    </button>
                  </div>
                </div>
              )}
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </m.div>
  );
}

const SILVER_BUTTON =
  "inline-flex h-12 items-center gap-2 rounded-full bg-[linear-gradient(180deg,#f6f7f9,#bcc1ca)] px-6 text-[0.9375rem] font-semibold text-[#0b0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-shadow hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_32px_-8px_rgb(44_157_245/0.7)]";

function Question({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <h2 className="max-w-[20ch] text-[clamp(1.75rem,3.6vw,2.4rem)] leading-[1.1] font-semibold tracking-[-0.035em] text-balance">{title}</h2>
      {hint && <p className="mt-3 text-[0.9375rem] text-white/55">{hint}</p>}
    </>
  );
}

function OkRow({ canGo, onOk, onBack }: { canGo: boolean; onOk?: () => void; onBack?: () => void }) {
  return (
    <>
      {onOk && (
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={onOk}
            disabled={!canGo}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-5 text-[0.875rem] font-semibold transition-[background,color,opacity] duration-300",
              canGo ? "bg-[linear-gradient(180deg,#f6f7f9,#bcc1ca)] text-[#0b0b0e]" : "bg-white/15 text-white/40",
            )}
          >
            OK
            <Check className="size-3.5" aria-hidden="true" />
          </button>
          <span className="font-mono text-[0.6875rem] text-white/40">
            ou <span className="text-white/70">Enter</span>
          </span>
        </div>
      )}
      {onBack && (
        <button type="button" onClick={onBack} className="mt-8 inline-flex items-center gap-2 font-mono text-[0.75rem] text-white/45 transition-colors hover:text-white/80">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          voltar uma pergunta
        </button>
      )}
    </>
  );
}

function TextStep({
  title,
  hint,
  placeholder,
  value,
  onChange,
  canGo,
  onOk,
  onBack,
  inputMode,
  autoComplete,
  extra,
}: {
  title: string;
  hint?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  canGo: boolean;
  onOk: () => void;
  onBack?: () => void;
  inputMode?: "text" | "tel";
  autoComplete?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <Question title={title} hint={hint} />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-label={placeholder}
        className="mt-8 w-full border-b border-white/20 bg-transparent pb-3 text-[clamp(1.5rem,3vw,2rem)] text-white placeholder:text-white/25 focus:outline-none"
        style={{ borderBottomColor: value ? BLUE : undefined }}
        onFocus={(e) => (e.currentTarget.style.borderBottomColor = BLUE)}
      />
      {extra}
      <OkRow canGo={canGo} onOk={onOk} onBack={onBack} />
    </div>
  );
}

function ChoiceStep({
  title,
  hint,
  options,
  selected,
  onPick,
  multiple,
  canGo = false,
  onOk,
  onBack,
}: {
  title: string;
  hint?: string;
  options: readonly string[];
  selected: string[];
  onPick: (value: string) => void;
  multiple?: boolean;
  canGo?: boolean;
  onOk?: () => void;
  onBack?: () => void;
}) {
  return (
    <div>
      <Question title={title} hint={hint} />
      <div role={multiple ? "group" : "radiogroup"} aria-label={title} className="mt-8 space-y-2">
        {options.map((option, i) => {
          const on = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={on}
              onClick={() => onPick(option)}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left text-[0.9844rem] transition-[border-color,background-color] duration-200",
                on ? "border-[#2c9df5]/70 bg-[#2c9df5]/[0.08] text-white" : "border-white/10 bg-white/[0.015] text-white/85 hover:border-white/25 hover:bg-white/[0.04]",
              )}
            >
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[0.625rem]", on ? "border-[#2c9df5] bg-[#2c9df5] text-white" : "border-white/20 text-white/55")}>
                {on && multiple ? <Check className="size-3" aria-hidden="true" /> : LETTERS[i]}
              </span>
              {option}
            </button>
          );
        })}
      </div>
      <OkRow canGo={canGo} onOk={multiple ? onOk : undefined} onBack={onBack} />
    </div>
  );
}
