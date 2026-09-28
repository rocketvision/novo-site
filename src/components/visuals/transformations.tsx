"use client";

import { m, useTransform, type MotionValue } from "motion/react";
import { CalendarCheck, LayoutGrid, Store, UserRound, Zap } from "lucide-react";
import type { Resolved } from "@/lib/content/resolved";
import { cn } from "@/lib/utils";
import { Bar, ChatBubble, CheckDot, FileCard, SearchBox, SearchCard, StickyNote, Tag, shadow } from "./primitives";

type Problem = Resolved<"problem">;
type Symptom = Problem["symptoms"][number];

/**
 * Improviso que vira processo.
 *
 * Cada par de "antes e depois" da seção O que muda tem uma transformação própria, na ordem da copy:
 * planilha, conversa, busca, balcão, ideia no papel e tarefa repetida. Os objetos de partida são
 * os mesmos que caem sobre o hero. `t` vai de 0 (improviso) a 1 (resolvido).
 */
export type Transformation = { t: MotionValue<number>; before: string; after: string; problem: Problem };

const KINDS = ["file", "chat", "search", "store", "note", "tasks"] as const;

/** A primeira ideia da frase de "depois": o que o objeto passa a ser. */
export function headOf(after: string) {
  return after.split(/,| que /)[0].replace(/\.$/, "").trim();
}

/** O complemento da frase de "depois", quando existe. */
function tailOf(after: string) {
  const [, ...rest] = after.replace(/\.$/, "").split(", ");
  return rest.join(", ");
}

export function symptomOf(problem: Problem, kind: Symptom["kind"]) {
  return problem.symptoms.find((s) => s.kind === kind);
}

export function TransformationFor({ index, ...props }: Transformation & { index: number }) {
  switch (KINDS[index]) {
    case "file":
      return <FileToSystem {...props} />;
    case "chat":
      return <ChatToFlow {...props} />;
    case "search":
      return <SearchToTop {...props} />;
    case "store":
      return <CounterToStore {...props} />;
    case "note":
      return <NoteToProduct {...props} />;
    case "tasks":
      return <TasksToAutomation {...props} />;
    default:
      return <PlainTransformation {...props} />;
  }
}

/** Saída dos objetos do improviso: convergem, endireitam e somem. */
function useScatter(t: MotionValue<number>, x: number, y: number, rotate: number) {
  return {
    x: useTransform(t, [0, 0.6], [`${x}em`, "0em"]),
    y: useTransform(t, [0, 0.6], [`${y}em`, "0em"]),
    rotate: useTransform(t, [0, 0.6], [rotate, 0]),
    scale: useTransform(t, [0, 0.6], [1, 0.86]),
    opacity: useTransform(t, [0.35, 0.6], [1, 0]),
  };
}

/** Entrada do estado resolvido. */
function useSettle(t: MotionValue<number>) {
  return {
    opacity: useTransform(t, [0.45, 0.75], [0, 1]),
    scale: useTransform(t, [0.45, 1], [0.92, 1]),
    y: useTransform(t, [0.45, 1], ["1.2em", "0em"]),
  };
}

function Layer({ style, children, className }: { style: object; children: React.ReactNode; className?: string }) {
  return (
    <m.div style={style} className={cn("absolute inset-0 flex items-center justify-center", className)}>
      {children}
    </m.div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="relative h-[26em] w-[30em]">{children}</div>;
}

/* Planilhas espalhadas viram um sistema único. */
function FileToSystem({ t, after, problem }: Transformation) {
  const file = symptomOf(problem, "file");
  const name = file?.artifact ?? "planilha.xlsx";
  const a = useScatter(t, -5, -5, -9);
  const b = useScatter(t, 6, -1.5, 7);
  const c = useScatter(t, -2.5, 5, -3);
  const settle = useSettle(t);
  const rows = useTransform(t, [0.7, 1], [0, 1]);

  return (
    <Frame>
      <Layer style={c}>
        <FileCard name={name.replace(/\s*\(\d+\)/, "").replace("v7", "v6")} meta={file?.meta} />
      </Layer>
      <Layer style={b}>
        <FileCard name={name.replace(/\s*\(\d+\)/, "")} meta={file?.meta} />
      </Layer>
      <Layer style={a}>
        <FileCard name={name} meta={file?.meta} />
      </Layer>
      <Layer style={settle}>
        <div className={cn("w-[21em] rounded-[1.2em] bg-white p-[1.2em]", shadow)}>
          <div className="flex items-center gap-[0.7em]">
            <span className="flex size-[2.2em] items-center justify-center rounded-[0.6em] bg-ink text-white">
              <LayoutGrid className="size-[1.1em]" strokeWidth={1.75} />
            </span>
            <p className="text-[0.95em] font-semibold tracking-tight text-ink">{headOf(after)}</p>
          </div>
          <m.ul style={{ opacity: rows }} className="mt-[1em] space-y-[0.55em] border-t border-line pt-[0.9em]">
            {["w-3/4", "w-1/2", "w-2/3", "w-2/5"].map((w, i) => (
              <li key={i} className="flex items-center gap-[0.7em]">
                <span className="size-[0.5em] rounded-full bg-emerald-500" />
                <Bar className={w} />
                <CheckDot className="ml-auto size-[1.2em]" />
              </li>
            ))}
          </m.ul>
          {tailOf(after) && <p className="mt-[0.9em] text-[0.72em] leading-snug text-muted">{tailOf(after)}</p>}
        </div>
      </Layer>
    </Frame>
  );
}

/* A conversa perdida vira um fluxo com histórico e responsável por etapa. */
function ChatToFlow({ t, after, problem }: Transformation) {
  const chat = symptomOf(problem, "chat");
  const text = chat?.artifact ?? "";
  const back = useScatter(t, 3, -6, 5);
  const front = useScatter(t, -2, 2, -4);
  const settle = useSettle(t);
  const steps = [useStep(t, 0), useStep(t, 1), useStep(t, 2)];

  return (
    <Frame>
      <Layer style={back}>
        <ChatBubble text={text} className="opacity-60" />
      </Layer>
      <Layer style={front}>
        <ChatBubble text={text} meta={chat?.meta} />
      </Layer>
      <Layer style={settle}>
        <div className={cn("w-[21em] rounded-[1.2em] bg-white p-[1.2em]", shadow)}>
          <p className="text-[0.95em] font-semibold tracking-tight text-ink">{headOf(after)}</p>
          <ol className="relative mt-[1em] space-y-[0.9em]">
            <span className="absolute top-[0.9em] bottom-[0.9em] left-[0.85em] w-px bg-black/10" />
            {steps.map((style, i) => (
              <m.li key={i} style={style} className="relative flex items-start gap-[0.8em]">
                <span className="relative z-10 flex size-[1.8em] shrink-0 items-center justify-center rounded-full bg-mist text-graphite ring-[0.25em] ring-white">
                  <UserRound className="size-[1em]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1 pt-[0.15em]">
                  <Tag>Etapa {i + 1}</Tag>
                  {i === 0 ? (
                    <p className="mt-[0.35em] rounded-[0.6em] bg-mist px-[0.7em] py-[0.5em] text-[0.72em] leading-snug text-graphite">{text}</p>
                  ) : (
                    <Bar className={cn("mt-[0.5em]", i === 1 ? "w-3/4" : "w-1/2")} />
                  )}
                </div>
                <CheckDot className={cn("size-[1.2em]", i === 2 && "bg-black/10")} />
              </m.li>
            ))}
          </ol>
        </div>
      </Layer>
    </Frame>
  );
}

function useStep(t: MotionValue<number>, i: number) {
  const from = 0.6 + i * 0.12;
  return { opacity: useTransform(t, [from, from + 0.15], [0, 1]), x: useTransform(t, [from, from + 0.15], ["-0.6em", "0em"]) };
}

/* A busca na página 6 sobe para o primeiro resultado. */
function SearchToTop({ t, after, problem }: Transformation) {
  const search = symptomOf(problem, "search");
  const query = search?.artifact ?? "sua empresa";
  const lost = useScatter(t, 0, 6, 3);
  const settle = useSettle(t);
  const climb = useTransform(t, [0.6, 1], ["9.6em", "0em"]);
  const others = useTransform(t, [0.6, 1], ["-3.2em", "0em"]);

  return (
    <Frame>
      <Layer style={lost}>
        <SearchCard query={query} meta={search?.meta} className="opacity-80" />
      </Layer>
      <Layer style={settle}>
        <div className={cn("w-[21em] rounded-[1.2em] bg-white p-[1.2em]", shadow)}>
          <SearchBox query={query} />
          <div className="relative mt-[1em] h-[12.8em]">
            <m.ul style={{ y: others }} className="absolute inset-x-0 top-[3.2em] space-y-[0.8em]">
              {["w-4/5", "w-3/5", "w-2/3"].map((w, i) => (
                <li key={i} className="space-y-[0.4em] px-[0.6em] py-[0.35em]">
                  <Bar className="w-2/5 bg-black/[0.12]" />
                  <Bar className={w} />
                </li>
              ))}
            </m.ul>
            <m.div style={{ y: climb }} className="absolute inset-x-0 top-0 rounded-[0.8em] bg-white px-[0.6em] py-[0.45em] ring-[0.12em] ring-accent">
              <p className="text-[0.82em] font-semibold text-ink">{query}</p>
              <Bar className="mt-[0.4em] w-4/5" />
            </m.div>
          </div>
          <p className="mt-[0.4em] text-[0.72em] text-muted">{headOf(after)}</p>
        </div>
      </Layer>
    </Frame>
  );
}

/* O balcão fechado vira uma loja que vende a qualquer hora. */
function CounterToStore({ t, after, problem }: Transformation) {
  const file = symptomOf(problem, "file");
  // Mesmo horário da planilha do hero ("Última edição: 23:48"): a hora em que o balcão já fechou.
  const time = file?.meta.match(/\d{1,2}:\d{2}/)?.[0] ?? "23:48";
  const sign = useScatter(t, 0, -1, -6);
  const settle = useSettle(t);
  const tail = tailOf(after);

  return (
    <Frame>
      <Layer style={sign}>
        <div className="flex flex-col items-center">
          <span className="h-[3em] w-px bg-white/40" />
          <div className={cn("flex items-center gap-[0.7em] rounded-[0.8em] bg-white px-[1.4em] py-[0.9em]", shadow)}>
            <Store className="size-[1.2em] text-muted" strokeWidth={1.75} />
            <span className="text-[1.3em] font-semibold tracking-tight text-ink">Fechado</span>
          </div>
        </div>
      </Layer>
      <Layer style={settle}>
        <div className={cn("w-[19em] rounded-[1.2em] bg-white p-[1.3em]", shadow)}>
          <Tag>{headOf(after)}</Tag>
          <p className="mt-[0.5em] font-mono text-[2.6em] leading-none font-medium tracking-tight text-ink tabular-nums">{time}</p>
          <div className="mt-[1em] flex items-center gap-[0.6em] border-t border-line pt-[0.9em]">
            <CheckDot />
            <Bar className="w-1/2" />
          </div>
          {tail && (
            <p className="mt-[0.9em] inline-flex rounded-full bg-mist px-[0.8em] py-[0.35em] text-[0.7em] font-medium text-graphite">{tail}</p>
          )}
        </div>
      </Layer>
    </Frame>
  );
}

/* A ideia no post-it vira um produto no aparelho do cliente. */
function NoteToProduct({ t, after, problem }: Transformation) {
  const note = symptomOf(problem, "note");
  const paper = useScatter(t, 0, 0, 5);
  const settle = useSettle(t);
  const icon = useTransform(t, [0.7, 0.95], [0, 1]);

  return (
    <Frame>
      <Layer style={paper}>
        <StickyNote text={note?.artifact ?? ""} />
      </Layer>
      <Layer style={settle}>
        <div className="flex flex-col items-center gap-[1em]">
          <div className={cn("relative h-[20em] w-[10em] rounded-[1.7em] bg-ink p-[0.35em]", shadow)}>
            <div className="relative h-full overflow-hidden rounded-[1.4em] bg-paper px-[0.9em] pt-[2.4em]">
              <span className="absolute top-[0.6em] left-1/2 h-[0.9em] w-[3.2em] -translate-x-1/2 rounded-full bg-ink" />
              <div className="grid grid-cols-3 gap-[0.7em]">
                {Array.from({ length: 9 }).map((_, i) =>
                  i === 4 ? (
                    <m.span key={i} style={{ scale: icon }} className="flex aspect-square items-center justify-center rounded-[0.55em] bg-accent text-white">
                      <CalendarCheck className="size-[1.1em]" strokeWidth={2} />
                    </m.span>
                  ) : (
                    <span key={i} className="aspect-square rounded-[0.55em] bg-black/[0.06]" />
                  ),
                )}
              </div>
            </div>
          </div>
          <p className="text-[0.8em] font-medium text-white/80">{headOf(after)}</p>
        </div>
      </Layer>
    </Frame>
  );
}

/* A mesma tarefa repetida o dia inteiro vira uma automação. */
function TasksToAutomation({ t, after }: Transformation) {
  const settle = useSettle(t);
  const pile = [
    useScatter(t, -1.2, -4.8, -4),
    useScatter(t, 1, -2.4, 3),
    useScatter(t, -0.6, 0, -2),
    useScatter(t, 1.4, 2.4, 4),
    useScatter(t, -1, 4.8, -3),
  ];

  return (
    <Frame>
      {pile.map((style, i) => (
        <Layer key={i} style={style}>
          <div className={cn("flex w-[17em] items-center gap-[0.8em] rounded-[0.9em] bg-white px-[1em] py-[0.8em]", shadow)}>
            <span className="size-[1.2em] shrink-0 rounded-[0.3em] ring-[0.12em] ring-black/25" />
            <Bar className="w-3/5" />
          </div>
        </Layer>
      ))}
      <Layer style={settle}>
        <div className={cn("w-[19em] rounded-[1.2em] bg-white p-[1.2em]", shadow)}>
          <div className="flex items-center gap-[0.7em]">
            <span className="flex size-[2.2em] items-center justify-center rounded-[0.6em] bg-accent text-white">
              <Zap className="size-[1.1em]" strokeWidth={2} />
            </span>
            <p className="text-[0.95em] font-semibold tracking-tight text-ink">{headOf(after)}</p>
          </div>
          <ul className="mt-[1em] space-y-[0.5em] border-t border-line pt-[0.9em]">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-[0.7em]">
                <CheckDot className="size-[1.2em]" />
                <Bar className="w-3/5" />
              </li>
            ))}
          </ul>
        </div>
      </Layer>
    </Frame>
  );
}

/* Par adicionado pelo CMS além dos seis originais: o antes riscado dá lugar ao depois. */
function PlainTransformation({ t, before, after }: Transformation) {
  const out = useScatter(t, 0, 0, -3);
  const settle = useSettle(t);
  return (
    <Frame>
      <Layer style={out}>
        <div className={cn("w-[18em] rounded-[1.1em] bg-white p-[1.2em] text-[0.9em] text-muted line-through", shadow)}>{before}</div>
      </Layer>
      <Layer style={settle}>
        <div className={cn("flex w-[19em] items-center gap-[0.8em] rounded-[1.1em] bg-white p-[1.2em]", shadow)}>
          <CheckDot />
          <p className="text-[0.9em] font-semibold text-ink">{headOf(after)}</p>
        </div>
      </Layer>
    </Frame>
  );
}
