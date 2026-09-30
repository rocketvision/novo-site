"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarPlus, Check, Copy, Video } from "lucide-react";
import { formatDay, localTime } from "@/lib/booking";
import { cn } from "@/lib/utils";

type Day = { date: string; times: { time: string; start: string }[] };
type Booked = { start: string; end: string; meetUrl: string | null; calendarUrl: string };

const BLUE = "#2c9df5";

/** Carrega os dias com horários livres. `null` enquanto carrega; `connected: false` sem agenda conectada. */
export function useSlots(enabled: boolean) {
  const [state, setState] = useState<{ connected: boolean; days: Day[] } | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetch("/api/agenda/horarios", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { connected: false, days: [] }))
      .then((data) => alive && setState(data))
      .catch(() => alive && setState({ connected: false, days: [] }));
    return () => {
      alive = false;
    };
  }, [enabled, version]);
  return { slots: state, reload: () => setVersion((v) => v + 1) };
}

/**
 * Agendamento da call dentro do quiz: faixa de dias, horários de manhã e de tarde, e-mail opcional
 * para receber o convite, e a confirmação com o Google Meet e o "adicionar à minha agenda".
 */
export function Scheduler({
  first,
  days,
  diagnostic,
  onBack,
  onTaken,
  onClose,
}: {
  first: string;
  days: Day[];
  diagnostic: { id: string; token: string };
  onBack: () => void;
  onTaken: () => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(days[0]?.date ?? "");
  const [start, setStart] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);
  const [copied, setCopied] = useState(false);

  const day = days.find((d) => d.date === date) ?? days[0];
  const groups = useMemo(() => {
    const times = day?.times ?? [];
    return [
      { label: "Manhã", times: times.filter((t) => t.time < "12:00") },
      { label: "Tarde", times: times.filter((t) => t.time >= "12:00") },
    ].filter((g) => g.times.length > 0);
  }, [day]);

  const chosen = start ? `${formatDay(date)} às ${localTime(new Date(start))}` : null;
  const emailOk = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function confirm() {
    if (!start || !emailOk) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosticId: diagnostic.id, token: diagnostic.token, start, email: email.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok) setBooked(data);
      else if (response.status === 409 && data?.error?.code === "slot_taken") {
        setError("Esse horário acabou de ser ocupado. Escolha outro.");
        setStart(null);
        onTaken();
      } else setError(data?.error?.message ?? "Não foi possível agendar agora. Tente de novo ou chame no WhatsApp.");
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  if (booked) {
    const when = `${formatDay(date)} às ${localTime(new Date(booked.start))}`;
    return (
      <div className="pt-6 pb-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full" style={{ background: `${BLUE}22`, boxShadow: `0 0 0 1px ${BLUE}55` }}>
          <Check className="size-6" style={{ color: BLUE }} aria-hidden="true" />
        </span>
        <h2 className="mt-6 text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.045em]">Call marcada, {first}!</h2>
        <p className="mt-4 text-[1.0625rem] text-white/75 first-letter:uppercase">{when}</p>
        <p className="mt-1 text-[0.875rem] text-white/45">30 minutos pelo Google Meet · horário de Brasília</p>

        <div className="mx-auto mt-8 max-w-[28rem] rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
          {booked.meetUrl && (
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
                <Video className="size-4.5 text-white/80" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.75rem] text-white/45">Link da call</p>
                <p className="truncate text-[0.9375rem] text-white">{booked.meetUrl.replace(/^https:\/\//, "")}</p>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(booked.meetUrl!).then(() => setCopied(true))}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[0.8125rem] text-white/80 hover:border-white/35 hover:text-white"
              >
                {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          )}
          {email && <p className="mt-4 border-t border-white/10 pt-4 text-[0.8125rem] text-white/55">O convite do Google Agenda foi para {email.trim()}.</p>}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {booked.meetUrl && (
            <a href={booked.meetUrl} target="_blank" rel="noreferrer" className={SILVER}>
              Abrir o Google Meet
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          )}
          <a href={booked.calendarUrl} target="_blank" rel="noreferrer" className={OUTLINE}>
            <CalendarPlus className="size-4" aria-hidden="true" />
            Adicionar à minha agenda
          </a>
        </div>
        <button type="button" onClick={onClose} className="mt-6 font-mono text-[0.75rem] text-white/45 hover:text-white/80">
          voltar pro site
        </button>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-6">
      <h2 className="text-[clamp(1.9rem,4vw,2.6rem)] leading-[1.08] font-semibold tracking-[-0.04em]">Escolha o melhor horário, {first}.</h2>
      <p className="mt-2 text-[0.9375rem] text-white/55">Call de 30 minutos pelo Google Meet · horário de Brasília</p>

      {/* Dias: uma faixa que rola no celular. */}
      <div className="-mx-6 mt-8 overflow-x-auto px-6 pb-2 [scrollbar-width:none]" role="radiogroup" aria-label="Dia">
        <div className="flex gap-2">
          {days.map((d) => {
            const on = d.date === date;
            return (
              <button
                key={d.date}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setDate(d.date);
                  setStart(null);
                }}
                className={cn(
                  "flex w-[4.25rem] shrink-0 flex-col items-center rounded-xl border px-2 py-3 transition-[border-color,background-color] duration-200",
                  on ? "border-[#2c9df5] bg-[#2c9df5]/[0.12]" : "border-white/10 bg-white/[0.02] hover:border-white/25",
                )}
              >
                <span className="text-[0.6875rem] tracking-wide text-white/50 uppercase">{formatDay(d.date, "weekday")}</span>
                <span className="mt-1 text-[1.375rem] leading-none font-semibold tabular-nums">{formatDay(d.date, "day")}</span>
                <span className="mt-1 text-[0.6875rem] text-white/45">{formatDay(d.date, "month")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horários do dia escolhido. */}
      <div className="mt-6 space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-white/40 uppercase">{g.label}</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={`Horários da ${g.label.toLowerCase()}`}>
              {g.times.map((t) => {
                const on = t.start === start;
                return (
                  <button
                    key={t.start}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setStart(t.start)}
                    className={cn(
                      "h-11 rounded-lg border text-[0.9375rem] tabular-nums transition-[border-color,background-color,color] duration-200",
                      on ? "border-[#2c9df5] bg-[#2c9df5] text-white" : "border-white/12 bg-white/[0.02] text-white/85 hover:border-white/35",
                    )}
                  >
                    {t.time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <label className="mt-7 block">
        <span className="text-[0.8125rem] text-white/55">Seu e-mail (opcional), pra receber o convite no calendário</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          className="mt-2 w-full border-b border-white/20 bg-transparent pb-2 text-[1.0625rem] text-white placeholder:text-white/25 focus:border-[#2c9df5] focus:outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="mt-5 text-[0.875rem] text-amber-300">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="button" onClick={confirm} disabled={!start || !emailOk || sending} className={cn(SILVER, (!start || !emailOk) && "pointer-events-none opacity-40")}>
          {sending ? "Agendando…" : chosen ? <span className="first-letter:uppercase">Confirmar {chosen}</span> : "Escolha um horário"}
          {!sending && <ArrowRight className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <button type="button" onClick={onBack} className="mt-8 inline-flex items-center gap-2 font-mono text-[0.75rem] text-white/45 transition-colors hover:text-white/80">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        voltar
      </button>
    </div>
  );
}

const SILVER =
  "inline-flex h-12 items-center gap-2 rounded-full bg-[linear-gradient(180deg,#f6f7f9_0%,#d3d7de_55%,#b9bec7_100%)] px-6 text-[0.95rem] font-medium text-[#0b0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.18),0_10px_30px_-12px_rgba(0,0,0,0.8)] transition-[transform,box-shadow] duration-300 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.18),0_14px_40px_-10px_rgb(44_157_245/0.55)]";
const OUTLINE =
  "inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.03] px-6 text-[0.95rem] font-medium text-white/85 transition-colors hover:border-white/40 hover:bg-white/[0.07] hover:text-white";
