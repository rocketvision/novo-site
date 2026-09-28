import { LogoMark } from "@/components/ui/logo";
import type { Resolved } from "@/lib/content/resolved";
import { cn } from "@/lib/utils";
import { ChatBubble, CheckDot, FileCard, SearchCard, Stage, softShadow } from "./primitives";

type Problem = Resolved<"problem">;

/**
 * Manifesto: os mesmos improvisos que caíram tortos sobre o hero, agora alinhados,
 * resolvidos e ligados à Rocket por uma única linha. Caos, transformação, ordem.
 */
export function OrderedStack({ problem }: { problem: Problem }) {
  return (
    <Stage size={[4.4, 2.5]} className="bg-mist">
      <div className="relative flex flex-col items-center">
        <span className="flex size-[3.4em] items-center justify-center rounded-full bg-ink text-accent shadow-[0_1em_2em_-1em_rgb(0_0_0/0.5)]">
          <LogoMark className="size-[1.9em]" />
        </span>
        <ul className="relative mt-[1.4em] space-y-[1.1em]">
          <span className="absolute top-[-1.4em] bottom-[2em] left-1/2 w-px -translate-x-1/2 bg-ink/15" />
          {problem.symptoms.map((symptom, i) => (
            <li key={i} className="relative">
              <Symptom symptom={symptom} />
              <CheckDot className="absolute -top-[0.6em] -right-[0.6em] ring-[0.25em] ring-mist" />
            </li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

function Symptom({ symptom }: { symptom: Problem["symptoms"][number] }) {
  switch (symptom.kind) {
    case "file":
      return <FileCard name={symptom.artifact} meta={symptom.meta} className={softShadow} />;
    case "chat":
      return <ChatBubble text={symptom.artifact} meta={symptom.meta} className={softShadow} />;
    case "search":
      return <SearchCard query={symptom.artifact} meta={symptom.meta} className={softShadow} />;
    case "note":
      return (
        <div className={cn("w-[17em] bg-[#fde68a] px-[1.1em] py-[1em]", softShadow)}>
          <p className="text-[0.9em] leading-snug font-medium text-[#3b2f0b] italic">{symptom.artifact}</p>
        </div>
      );
  }
}
