import Image from "next/image";
import type { Screen } from "@/content/projects";
import { cn } from "@/lib/utils";

/** Janela de navegador para prints de desktop (proporção 16:10). */
export function BrowserFrame({ screen, sizes, className }: { screen: Screen; sizes: string; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[0.9rem] bg-[#1c1c1e] p-px shadow-[0_50px_100px_-30px_rgb(0_0_0/0.55),0_30px_60px_-40px_rgb(0_0_0/0.6)] ring-1 ring-black/10",
        className,
      )}
    >
      <div className="flex h-[clamp(1.25rem,2.2vw,2rem)] items-center gap-[0.4em] bg-[#2a2a2c] px-[0.9em] text-[clamp(0.45rem,0.7vw,0.6rem)]">
        <span className="size-[0.85em] rounded-full bg-[#ff5f57]" />
        <span className="size-[0.85em] rounded-full bg-[#febc2e]" />
        <span className="size-[0.85em] rounded-full bg-[#28c840]" />
      </div>
      <div className="relative aspect-[16/10]">
        <Image src={screen.src} alt={screen.alt} fill sizes={sizes} quality={85} placeholder="blur" className="object-cover object-top" />
      </div>
    </div>
  );
}

/** Aparelho celular para prints mobile (proporção 390:844). */
export function PhoneFrame({ screen, sizes, className }: { screen: Screen; sizes: string; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[14%/6.5%] bg-[#0b0b0c] p-[2.6%] shadow-[0_50px_90px_-30px_rgb(0_0_0/0.6)] ring-1 ring-white/10",
        className,
      )}
    >
      <div className="relative aspect-[390/844] overflow-hidden rounded-[11.5%/5.3%]">
        <Image src={screen.src} alt={screen.alt} fill sizes={sizes} quality={85} placeholder="blur" className="object-cover" />
        <span className="absolute top-[1.6%] left-1/2 h-[3.6%] w-[31%] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}
