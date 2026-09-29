"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

/** Compartilhamento por link direto, sem scripts de terceiros. */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
  ];
  const item = "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm text-graphite ring-1 ring-inset ring-black/10 transition-colors hover:bg-mist hover:text-ink";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-subtle">Compartilhar</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={item}>
          {l.label}
        </a>
      ))}
      <button
        type="button"
        className={item}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            /* sem permissão de área de transferência: o endereço continua na barra do navegador */
          }
        }}
      >
        {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Link2 aria-hidden="true" className="size-3.5" />}
        <span aria-live="polite">{copied ? "Link copiado" : "Copiar link"}</span>
      </button>
    </div>
  );
}
