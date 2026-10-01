"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { alliancePage } from "@/content/alliance";
import type { DirectoryCard } from "@/lib/alliance/types";
import { cn } from "@/lib/utils";
import { TierBadge } from "./tier-badge";

const BLUE = "#2c9df5";
const PAGE = 12;
const copy = alliancePage.directory;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Diretório dos parceiros publicados: busca por nome, setor, descrição e local; filtros por
 * modalidade e setor; 12 por vez com "ver mais". Tudo no navegador (a lista publicada é pequena e já
 * vem renderizada no servidor, para buscadores e para quem está sem JavaScript).
 */
export function Directory({ partners, modalities, tiers }: { partners: DirectoryCard[]; modalities: { key: string; name: string }[]; tiers: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const [modality, setModality] = useState("");
  const [sector, setSector] = useState("");
  const [shown, setShown] = useState(PAGE);
  const deferred = useDeferredValue(query);

  const sectors = useMemo(() => [...new Set(partners.map((p) => p.sector).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [partners]);
  const results = useMemo(() => {
    const q = normalize(deferred.trim());
    return partners.filter(
      (p) =>
        (!modality || p.modalities.includes(modality)) &&
        (!sector || p.sector === sector) &&
        (!q || normalize(`${p.tradeName} ${p.sector} ${p.shortDescription} ${p.location}`).includes(q)),
    );
  }, [partners, deferred, modality, sector]);
  const filtered = Boolean(query || modality || sector);
  const nameOf = (key: string) => modalities.find((m) => m.key === key)?.name.replace(/\s*Partner$/, "") ?? key;

  if (partners.length === 0) {
    return (
      <div className="mt-14 flex flex-col items-center rounded-3xl border border-dashed border-white/15 px-6 py-20 text-center">
        <EmptyConstellation />
        <p className="mt-6 max-w-[26rem] text-[1rem] leading-relaxed text-white/60">{copy.empty}</p>
        <a href="#aplicar" className="mt-6 text-[0.9rem] font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
          {alliancePage.hero.primary}
        </a>
      </div>
    );
  }

  return (
    <div className="mt-14">
      <div role="search" className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{copy.search}</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder={copy.search}
            className="h-12 w-full rounded-full border border-white/12 bg-white/[0.03] pr-4 pl-11 text-[0.95rem] text-white placeholder:text-white/35 transition-colors outline-none hover:border-white/25 focus:border-white/40"
          />
        </label>
        <FilterSelect label={copy.allModalities} value={modality} onChange={(v) => { setModality(v); setShown(PAGE); }} options={modalities.map((m) => ({ value: m.key, label: m.name }))} />
        {sectors.length > 1 && <FilterSelect label={copy.allSectors} value={sector} onChange={(v) => { setSector(v); setShown(PAGE); }} options={sectors.map((s) => ({ value: s, label: s }))} />}
      </div>

      <p aria-live="polite" className="mt-5 text-[0.8125rem] text-white/45">
        {results.length === 1 ? "1 parceiro" : `${results.length} parceiros`}
        {filtered && (
          <button type="button" onClick={() => { setQuery(""); setModality(""); setSector(""); }} className="ml-3 inline-flex items-center gap-1 text-white/70 underline-offset-4 hover:text-white hover:underline">
            <X className="size-3" aria-hidden="true" /> {copy.clear}
          </button>
        )}
      </p>

      {results.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center text-[0.95rem] text-white/55">{copy.noResults}</div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.slice(0, shown).map((p) => (
            <li key={p.id}>
              <PartnerCard partner={p} modalityName={nameOf} tierName={p.tierKey ? tiers[p.tierKey] : null} />
            </li>
          ))}
        </ul>
      )}

      {results.length > shown && (
        <div className="mt-10 text-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="inline-flex h-11 items-center rounded-full border border-white/15 px-6 text-[0.9rem] font-medium text-white/85 transition-colors hover:border-white/35 hover:text-white">
            {copy.more}
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="relative md:w-60">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-full border border-white/12 bg-[#0b0b0e] pr-10 pl-5 text-[0.9rem] text-white/85 transition-colors outline-none hover:border-white/25 focus:border-white/40"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}

function PartnerCard({ partner: p, modalityName, tierName }: { partner: DirectoryCard; modalityName: (k: string) => string; tierName: string | null }) {
  const [loaded, setLoaded] = useState(false);
  const logo = p.logoAlt ?? p.logo;
  return (
    <Link
      href={`/partners/${p.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-[#0d0e11] ring-1 ring-white/[0.08] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgb(44_157_245/0.45)] hover:ring-white/20"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[#0b0c0f]">
        {p.cover && <Image src={p.cover.src} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="object-cover opacity-35 transition-[opacity,transform] duration-700 group-hover:scale-[1.04] group-hover:opacity-50" />}
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_100%,transparent,rgb(11_12_15/0.7))]" />
        <div className="absolute inset-0 flex items-center justify-center p-10">
          {logo ? (
            <>
              {!loaded && <span aria-hidden="true" className="absolute h-10 w-32 animate-pulse rounded-lg bg-white/[0.06]" />}
              <Image
                src={logo.src}
                alt={`Logotipo ${p.tradeName}`}
                width={logo.width}
                height={logo.height}
                sizes="220px"
                onLoad={() => setLoaded(true)}
                className={cn("max-h-14 w-auto max-w-[70%] object-contain transition-opacity duration-500", !p.logoAlt && "brightness-0 invert", loaded ? "opacity-95" : "opacity-0")}
              />
            </>
          ) : (
            <span className="text-[1.6rem] font-semibold tracking-[-0.03em] text-white/85">{p.tradeName}</span>
          )}
        </div>
        {tierName && p.tierKey && (
          <div className="absolute top-4 right-4">
            <TierBadge tier={p.tierKey} size={72} detailed title={`Selo ${tierName}`} className="drop-shadow-[0_10px_24px_rgb(0_0_0/0.5)]" />
          </div>
        )}
        {p.featured && (
          <span className="absolute top-4 left-4 rounded-full bg-white/[0.08] px-2.5 py-1 text-[0.7rem] font-medium text-white/80 ring-1 ring-white/15 backdrop-blur">Destaque</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-[1.1rem] font-semibold tracking-[-0.02em] text-white">{p.tradeName}</h3>
            <p className="mt-0.5 truncate text-[0.8125rem] text-white/45">{[p.sector, p.location].filter(Boolean).join(" · ")}</p>
          </div>
          <ArrowUpRight className="mt-1 size-4 shrink-0 text-white/35 transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" aria-hidden="true" />
        </div>
        <p className="mt-4 line-clamp-3 text-[0.875rem] leading-relaxed text-white/60">{p.shortDescription}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
          {p.modalities.map((m) => (
            <span key={m} className="rounded-full px-2.5 py-1 text-[0.7rem] text-white/70 ring-1 ring-white/12">
              {modalityName(m)}
            </span>
          ))}
          {tierName && (
            <span className="rounded-full px-2.5 py-1 text-[0.7rem] font-medium text-white/80 ring-1 ring-white/12">{tierName}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Estado vazio do diretório: a constelação ainda sem pontos acesos. */
function EmptyConstellation() {
  return (
    <svg viewBox="0 0 120 60" className="h-16 w-32" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="30" rx="54" ry="20" stroke="rgb(255 255 255 / 0.12)" transform="rotate(-8 60 30)" />
      <ellipse cx="60" cy="30" rx="32" ry="12" stroke="rgb(255 255 255 / 0.1)" transform="rotate(-8 60 30)" />
      <circle cx="60" cy="30" r="3.5" fill={BLUE} />
      {[
        [14, 36],
        [34, 18],
        [88, 20],
        [104, 26],
        [78, 42],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="rgb(255 255 255 / 0.3)" />
      ))}
    </svg>
  );
}
