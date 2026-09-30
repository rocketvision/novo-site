"use client";

import { siteHref } from "@/lib/cms/site-link";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Eye, Star } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Badge, EmptyState } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { cn } from "@/lib/utils";

type Row = { id: string; tradeName: string; slug: string; logoUrl: string | null; featured: boolean; published: boolean; hasChanges: boolean; status: string };

/**
 * Diretório público: quem está no ar, em que ordem e quem fica em destaque. Ordem e destaque valem na
 * hora; publicar e tirar do ar ficam no cadastro de cada parceiro (com a revisão do conteúdo).
 */
export function DirectoryAdmin({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const published = rows.filter((r) => r.published);
  const [order, setOrder] = useState(published.map((r) => r.id));
  const [busy, setBusy] = useState<string | null>(null);
  const changed = useMemo(() => order.join() !== published.map((r) => r.id).join(), [order, published]);
  const byId = new Map(rows.map((r) => [r.id, r]));

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  const move = (i: number, to: number) =>
    setOrder((o) => {
      const c = [...o];
      const [x] = c.splice(i, 1);
      c.splice(to, 0, x);
      return c;
    });

  const preview = (slug: string) => window.open(`/api/cms/preview?path=${encodeURIComponent(`/partners/${slug}`)}`, "_blank");
  const waiting = rows.filter((r) => !r.published && (r.status === "active" || r.status === "onboarding"));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">No diretório</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">Destaques aparecem primeiro; depois, a ordem abaixo.</p>
          </div>
          <div className="flex gap-2">
            <a href={siteHref("/partners#parceiros")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              Ver no site <ExternalLink className="size-3" />
            </a>
            {changed && (
              <Button
                size="sm"
                loading={busy === "order"}
                onClick={() =>
                  run("order", async () => {
                    await api("/api/cms/alliance/directory/order", { body: { ids: order } });
                    toast.success("Ordem salva. O diretório já mostra a nova ordem.");
                    router.refresh();
                  })
                }
              >
                Salvar ordem
              </Button>
            )}
          </div>
        </header>
        {order.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Nenhum parceiro publicado. Publique pelo cadastro de cada parceiro." />
          </div>
        ) : (
          <ol className="divide-y divide-zinc-100">
            {order.map((id, i) => {
              const r = byId.get(id)!;
              return (
                <li key={id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 text-right text-xs text-zinc-400 tabular-nums">{i + 1}</span>
                  <span className="flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-100 bg-zinc-50">
                    {r.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.logoUrl} alt="" className="max-h-7 max-w-12 object-contain" />
                    ) : null}
                  </span>
                  <Link href={`/cms/alliance/parceiros/${r.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 underline-offset-4 hover:underline">
                    {r.tradeName}
                  </Link>
                  {r.hasChanges && <Badge tone="amber">Alterações não publicadas</Badge>}
                  <button
                    type="button"
                    aria-pressed={r.featured}
                    aria-label={r.featured ? `Tirar o destaque de ${r.tradeName}` : `Destacar ${r.tradeName}`}
                    title={r.featured ? "Em destaque" : "Destacar"}
                    disabled={busy !== null}
                    onClick={() =>
                      run(`f-${r.id}`, async () => {
                        await api(`/api/cms/alliance/partners/${r.id}/featured`, { body: { featured: !r.featured } });
                        router.refresh();
                      })
                    }
                    className={cn("rounded p-1.5 hover:bg-zinc-100", r.featured ? "text-amber-500" : "text-zinc-300 hover:text-zinc-600")}
                  >
                    <Star className="size-4" fill={r.featured ? "currentColor" : "none"} />
                  </button>
                  <button type="button" aria-label={`Pré-visualizar ${r.tradeName}`} title="Pré-visualizar" onClick={() => preview(r.slug)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                    <Eye className="size-4" />
                  </button>
                  <button type="button" aria-label={`Subir ${r.tradeName}`} disabled={i === 0} onClick={() => move(i, i - 1)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" aria-label={`Descer ${r.tradeName}`} disabled={i === order.length - 1} onClick={() => move(i, i + 1)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">
                    <ArrowDown className="size-4" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {waiting.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white">
          <header className="border-b border-zinc-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-zinc-900">Aprovados, ainda fora do diretório</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">Para publicar: logotipo, descrição curta e site oficial no cadastro.</p>
          </header>
          <ul className="divide-y divide-zinc-100">
            {waiting.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <Link href={`/cms/alliance/parceiros/${r.id}`} className="min-w-0 flex-1 truncate text-sm text-zinc-900 underline-offset-4 hover:underline">
                  {r.tradeName}
                </Link>
                <button type="button" onClick={() => preview(r.slug)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[13px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
                  <Eye className="size-3.5" /> Pré-visualizar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
