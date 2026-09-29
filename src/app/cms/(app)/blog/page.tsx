import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Newspaper, Plus, Search, Star } from "lucide-react";
import { ButtonLink, buttonClass } from "@/components/cms/ui/button";
import { Input, Select } from "@/components/cms/ui/field";
import { Badge, EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { BlogNav } from "@/components/cms/blog/blog-nav";
import { relativeTime, formatDateTime } from "@/lib/cms/format";
import { STATUS_LABELS, STATUS_TONE, type BlogStatus } from "@/lib/blog/workflow";
import { articleListQuerySchema } from "@/lib/validation/blog";
import { cn } from "@/lib/utils";
import { can, requirePermission } from "@/server/authz/guard";
import { countArticlesByStatus, listArticles, listCategories, seesAllArticles } from "@/server/blog/service";

export const metadata: Metadata = { title: "Blog" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function BlogPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePermission("blog.view", "/cms/blog");
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const parsed = articleListQuerySchema.safeParse({ q: pick("q"), status: pick("status"), categoria: pick("categoria"), aba: pick("aba") });
  const query = parsed.success ? parsed.data : {};
  const all = seesAllArticles(user);
  const canReview = can(user, "blog.review");
  const aba = query.aba ?? (all ? "todos" : "meus");

  const [rows, counts, categories] = await Promise.all([listArticles(user, { ...query, aba }), countArticlesByStatus(user), listCategories()]);

  const tabs = [
    ...(all ? [{ key: "todos", label: "Todos" }] : []),
    { key: "meus", label: "Meus artigos" },
    ...(canReview ? [{ key: "revisao", label: `Em revisão${counts.in_review ? ` (${counts.in_review})` : ""}` }] : []),
  ];
  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = { q: query.q, status: query.status, categoria: query.categoria, aba, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/cms/blog?${qs}` : "/cms/blog";
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Blog"
        description={all ? "Artigos de toda a equipe e dos colunistas. Só artigos publicados aparecem no site." : "Seus artigos. Envie para revisão quando estiverem prontos: a equipe revisa antes de publicar."}
        actions={
          can(user, "blog.create") && (
            <ButtonLink href="/cms/blog/novo" size="sm">
              <Plus className="size-4" /> Novo artigo
            </ButtonLink>
          )
        }
      />
      <BlogNav current="artigos" show={{ categories: can(user, "blog.categories"), authors: can(user, "blog.authors"), profile: can(user, "blog.create") }} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <Link key={t.key} href={href({ aba: t.key, status: undefined })} aria-current={aba === t.key ? "page" : undefined} className={cn(buttonClass(aba === t.key ? "primary" : "ghost", "sm"))}>
              {t.label}
            </Link>
          ))}
        </div>
        <form role="search" action="/cms/blog" className="flex flex-wrap gap-2">
          <input type="hidden" name="aba" value={aba} />
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
            <Input type="search" name="q" defaultValue={query.q ?? ""} placeholder="Buscar artigos" aria-label="Buscar artigos" className="h-8 w-52 pl-8" maxLength={100} />
          </div>
          <Select name="status" defaultValue={query.status ?? ""} aria-label="Estado" className="h-8 w-40">
            <option value="">Todos os estados</option>
            {(Object.keys(STATUS_LABELS) as BlogStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]} ({counts[s]})
              </option>
            ))}
          </Select>
          <Select name="categoria" defaultValue={query.categoria ?? ""} aria-label="Categoria" className="h-8 w-44">
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <button type="submit" className={buttonClass("secondary", "sm")}>
            Filtrar
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="size-6" />}
          title={query.q || query.status || query.categoria ? "Nenhum artigo encontrado com esses filtros." : "Nenhum artigo ainda."}
          action={
            can(user, "blog.create") && (
              <ButtonLink href="/cms/blog/novo" size="sm">
                <Plus className="size-4" /> Escrever o primeiro
              </ButtonLink>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/cms/blog/${r.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50">
                <div className="relative hidden aspect-[16/9] w-24 shrink-0 overflow-hidden rounded bg-zinc-100 sm:block">
                  {r.coverUrl && <Image src={r.coverUrl} alt="" fill sizes="96px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-zinc-900">
                    {r.featured && <Star aria-label="Em destaque" className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    {r.title}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-zinc-500">
                    {[r.categoryName ?? "Sem categoria", r.authorName ?? "Sem autor", `${r.readingMinutes} min`].join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <Badge tone={STATUS_TONE[r.status]}>{r.status === "published" && r.hasChanges ? "Publicado · alterações pendentes" : STATUS_LABELS[r.status]}</Badge>
                  <span className="text-xs text-zinc-500">{r.status === "scheduled" && r.scheduledAt ? `Entra em ${formatDateTime(r.scheduledAt)}` : `Editado ${relativeTime(r.updatedAt)}`}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
