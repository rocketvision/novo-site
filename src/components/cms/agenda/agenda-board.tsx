"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarOff, ChevronLeft, ChevronRight, Lock, Unlock, Video } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Input, Select } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { formatDay, SLOT_TIMES, type SlotState } from "@/lib/booking";
import { cn } from "@/lib/utils";

type Slot = { time: string; start: string; state: SlotState; label?: string; blockId?: string; diagnosticId?: string | null; bookingId?: string };
type Day = { date: string; holiday?: string; slots: Slot[]; dayBlockId?: string };

const CELL: Record<SlotState, string> = {
  free: "bg-white text-zinc-400 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-700",
  busy: "bg-zinc-100 text-zinc-500 ring-zinc-200",
  blocked: "bg-[repeating-linear-gradient(135deg,#f4f4f5_0_6px,#e4e4e7_6px_7px)] text-zinc-600 ring-zinc-300 hover:ring-zinc-400",
  booked: "bg-sky-50 text-sky-800 ring-sky-300",
  past: "bg-zinc-50 text-zinc-300 ring-zinc-100",
  holiday: "bg-amber-50 text-amber-800 ring-amber-200",
};

/**
 * Grade da semana: cada horário de 30 min com o estado (livre, ocupado no Google, bloqueado, com call,
 * feriado). Clicar num horário livre bloqueia; num bloqueado, libera. Cada dia tem "Bloquear o dia".
 * Abaixo, o formulário para bloquear um intervalo com motivo.
 */
export function AgendaBoard({ days, week, weeks, canManage }: { days: Day[]; week: number; weeks: number; canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<unknown>, message: string) {
    setBusy(key);
    try {
      await action();
      toast.success(message);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(null);
    }
  }

  const block = (date: string, from?: string, to?: string, reason?: string) =>
    run(`${date}${from ?? ""}`, () => api("/api/cms/agenda/blocks", { body: { date, from, to, reason } }), from ? `${from} bloqueado.` : "Dia bloqueado.");
  const unblock = (id: string, what: string) => run(id, () => api(`/api/cms/agenda/blocks/${id}`, { method: "DELETE" }), `${what} liberado.`);

  const next = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const t = h * 60 + m + 30;
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-900">
          {formatDay(days[0].date, "day")} de {formatDay(days[0].date, "month")} a {formatDay(days[days.length - 1].date, "day")} de {formatDay(days[days.length - 1].date, "month")}
        </p>
        <div className="flex items-center gap-1">
          <Link aria-label="Semana anterior" href={`/cms/agenda?semana=${week - 1}`} className={cn("grid size-8 place-items-center rounded-md border border-zinc-200 bg-white", week <= 0 && "pointer-events-none opacity-40")}>
            <ChevronLeft className="size-4" />
          </Link>
          <Link aria-label="Próxima semana" href={`/cms/agenda?semana=${week + 1}`} className={cn("grid size-8 place-items-center rounded-md border border-zinc-200 bg-white", week >= weeks - 1 && "pointer-events-none opacity-40")}>
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-1.5 text-xs">
          <thead>
            <tr>
              <th className="w-14" />
              {days.map((d) => (
                <th key={d.date} className="px-1 pt-2 pb-1 text-left align-bottom font-normal">
                  <span className="block text-[11px] tracking-wide text-zinc-500 uppercase">{formatDay(d.date, "weekday")}</span>
                  <span className="block text-base font-semibold text-zinc-900">{formatDay(d.date, "day")}</span>
                  {d.holiday ? (
                    <span className="mt-1 block truncate text-[11px] text-amber-700">{d.holiday}</span>
                  ) : canManage ? (
                    d.dayBlockId ? (
                      <button type="button" disabled={busy !== null} onClick={() => unblock(d.dayBlockId!, "Dia")} className="mt-1 inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900">
                        <Unlock className="size-3" /> Liberar o dia
                      </button>
                    ) : (
                      <button type="button" disabled={busy !== null} onClick={() => block(d.date, undefined, undefined, "Dia bloqueado")} className="mt-1 inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900">
                        <CalendarOff className="size-3" /> Bloquear o dia
                      </button>
                    )
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOT_TIMES.map((time, row) => (
              <tr key={time} className={row === 4 ? "[&>td]:pt-3" : undefined}>
                <td className="pr-1 text-right align-middle font-mono text-[11px] text-zinc-400 tabular-nums">{time}</td>
                {days.map((d) => {
                  const slot = d.slots.find((s) => s.time === time)!;
                  const key = `${d.date}${time}`;
                  const content =
                    slot.state === "booked" ? (
                      <span className="flex items-center gap-1 truncate font-medium">
                        <Video className="size-3 shrink-0" /> {slot.label}
                      </span>
                    ) : slot.state === "blocked" ? (
                      <span className="flex items-center gap-1 truncate">
                        <Lock className="size-3 shrink-0" /> {slot.label}
                      </span>
                    ) : slot.state === "busy" ? (
                      "Ocupado"
                    ) : slot.state === "holiday" ? (
                      "Feriado"
                    ) : slot.state === "past" ? (
                      "—"
                    ) : (
                      "Livre"
                    );
                  const base = cn("flex h-9 w-full items-center rounded-md px-2 text-left ring-1 ring-inset transition-colors", CELL[slot.state], busy === key && "opacity-50");
                  if (slot.state === "booked" && slot.diagnosticId)
                    return (
                      <td key={d.date}>
                        <Link href={`/cms/diagnosticos/${slot.diagnosticId}`} className={base} title={slot.label}>
                          {content}
                        </Link>
                      </td>
                    );
                  const clickable = canManage && (slot.state === "free" || (slot.state === "blocked" && slot.blockId));
                  return (
                    <td key={d.date}>
                      {clickable ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          title={slot.state === "free" ? "Clique para bloquear" : `${slot.label}. Clique para liberar.`}
                          onClick={() => (slot.state === "free" ? block(d.date, time, next(time)) : unblock(slot.blockId!, "Horário"))}
                          className={base}
                        >
                          {content}
                        </button>
                      ) : (
                        <div className={base} title={slot.label}>
                          {content}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
        {(
          [
            ["free", "Livre (clique para bloquear)"],
            ["booked", "Call agendada"],
            ["busy", "Ocupado no Google Calendar"],
            ["blocked", "Bloqueado no CMS (clique para liberar)"],
            ["holiday", "Feriado"],
          ] as const
        ).map(([state, label]) => (
          <li key={state} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm ring-1 ring-inset", CELL[state])} />
            {label}
          </li>
        ))}
      </ul>

      {canManage && <BlockForm onSubmit={(date, from, to, reason) => block(date, from, to, reason)} pending={busy !== null} />}
    </div>
  );
}

/** Bloqueio com motivo: um intervalo de um dia, ou o dia inteiro. */
function BlockForm({ onSubmit, pending }: { onSubmit: (date: string, from?: string, to?: string, reason?: string) => void; pending: boolean }) {
  const [date, setDate] = useState("");
  const [whole, setWhole] = useState(true);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("11:00");
  const [reason, setReason] = useState("");
  const ends = [...SLOT_TIMES.slice(1), "11:00", "17:30"].filter((v, i, a) => a.indexOf(v) === i).sort();

  return (
    <form
      className="mt-6 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-[10rem_11rem_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!date) return;
        onSubmit(date, whole ? undefined : from, whole ? undefined : to, reason.trim() || undefined);
        setReason("");
      }}
    >
      <label className="text-xs text-zinc-600">
        Dia
        <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
      </label>
      <label className="text-xs text-zinc-600">
        Período
        <Select value={whole ? "dia" : "intervalo"} onChange={(e) => setWhole(e.target.value === "dia")} className="mt-1">
          <option value="dia">O dia inteiro</option>
          <option value="intervalo">Um intervalo</option>
        </Select>
      </label>
      <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr]">
        {!whole && (
          <>
            <label className="text-xs text-zinc-600">
              Das
              <Select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1">
                {SLOT_TIMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </label>
            <label className="text-xs text-zinc-600">
              Até
              <Select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1">
                {ends.filter((t) => t > from).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </label>
          </>
        )}
        <label className={cn("text-xs text-zinc-600", whole && "sm:col-span-3")}>
          Motivo (opcional)
          <Input value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: viagem, reunião com cliente" className="mt-1" />
        </label>
      </div>
      <Button type="submit" disabled={!date || pending}>
        <Lock className="size-4" /> Bloquear
      </Button>
    </form>
  );
}
