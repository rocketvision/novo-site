import Image from "next/image";
import Link from "next/link";
import type { PublicArticleCard } from "@/lib/blog/types";
import { formatArticleDate } from "@/lib/blog/format";
import { blur } from "@/components/projects/devices";
import { cn } from "@/lib/utils";

/** Cartão de artigo nas listas. `size="lead"` é o destaque principal do topo do Blog. */
export function ArticleCard({ article, size = "default", headingLevel = 3, priority }: { article: PublicArticleCard; size?: "default" | "lead" | "compact"; headingLevel?: 2 | 3; priority?: boolean }) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const lead = size === "lead";
  return (
    <article className={cn("group relative flex flex-col", lead && "lg:grid lg:grid-cols-12 lg:items-center lg:gap-12")}>
      {article.cover && size !== "compact" && (
        <div className={cn("relative overflow-hidden rounded-2xl bg-mist", lead ? "aspect-[16/10] lg:col-span-7" : "aspect-[16/10]")}>
          <Image
            src={article.cover.src}
            alt=""
            fill
            priority={priority}
            sizes={lead ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"}
            {...blur(article.cover)}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className={cn("flex flex-col", size !== "compact" && "mt-5", lead && "lg:col-span-5 lg:mt-0")}>
        <p className="text-eyebrow text-accent-strong">{article.category.name}</p>
        <Heading className={cn("mt-3 font-semibold tracking-[-0.02em] text-ink text-balance", lead ? "text-[clamp(1.75rem,3vw,2.6rem)] leading-[1.1]" : size === "compact" ? "text-base leading-snug" : "text-xl leading-snug")}>
          <Link href={`/blog/${article.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {article.title}
          </Link>
        </Heading>
        {size !== "compact" && <p className={cn("mt-3 text-muted", lead ? "text-lg leading-relaxed" : "line-clamp-3 text-[0.9375rem] leading-relaxed")}>{article.excerpt}</p>}
        <p className="mt-4 text-sm text-subtle">
          <span className="text-graphite">{article.author.name}</span>
          <span aria-hidden="true" className="mx-2">·</span>
          <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
          <span aria-hidden="true" className="mx-2">·</span>
          {article.readingMinutes} min de leitura
        </p>
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-3xl ring-2 ring-accent/0 transition group-focus-within:ring-accent/60" />
    </article>
  );
}
