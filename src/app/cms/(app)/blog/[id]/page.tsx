import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { ArticleEditor } from "@/components/cms/blog/article-editor";
import { mediaIdsOf, type BlogDocument } from "@/lib/blog/document";
import { can, requirePermission, requireUser } from "@/server/authz/guard";
import { getArticleForEditor, listAuthorOptions, listCategories, REVISION_REASONS } from "@/server/blog/service";
import { getMediaByIds } from "@/server/media/service";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await requireUser();
  const article = await getArticleForEditor(user, (await params).id);
  return { title: article ? article.row.title : "Artigo não encontrado" };
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const user = await requirePermission("blog.view", `/cms/blog/${id}`);
  // Artigo de outra pessoa, para quem só edita os próprios: 404, sem revelar que existe.
  const article = await getArticleForEditor(user, id);
  if (!article) notFound();

  const { row, input } = article;
  const [categories, authors, media] = await Promise.all([
    listCategories(),
    can(user, "blog.edit_any") ? listAuthorOptions() : Promise.resolve(null),
    getMediaByIds([input.coverMediaId, ...mediaIdsOf(input.content as BlogDocument)].filter(Boolean) as string[]),
  ]);

  return (
    <div>
      <PageHeader
        back={
          <Link href="/cms/blog" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Blog
          </Link>
        }
        title={row.title}
        description={article.createdByName ? `Criado por ${article.createdByName}` : undefined}
      />
      <ArticleEditor
        key={`${row.id}`}
        id={row.id}
        initial={{
          data: input,
          version: row.version,
          status: row.status,
          hasChanges: article.hasChanges,
          publishedSlug: article.publishedSlug,
          scheduledAt: row.scheduledAt?.toISOString() ?? null,
          updatedAt: row.updatedAt.toISOString(),
        }}
        canEdit={article.canEdit}
        actions={article.actions}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        authors={authors}
        media={Object.fromEntries([...media.values()].map((m) => [m.id, { id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height, filename: m.filename, blurDataUrl: m.blurDataUrl }]))}
        perms={{
          canUpload: can(user, "blog.create"),
          canFeature: can(user, "blog.publish"),
          canDelete: can(user, "blog.delete"),
          canComment: article.isOwner || can(user, "blog.review"),
        }}
        comments={article.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), resolvedAt: c.resolvedAt?.toISOString() ?? null }))}
        revisions={article.revisions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        revisionReasons={REVISION_REASONS}
      />
    </div>
  );
}
