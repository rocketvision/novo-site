import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { ArticleEditor } from "@/components/cms/blog/article-editor";
import { EMPTY_DOCUMENT } from "@/lib/blog/document";
import { can, requirePermission } from "@/server/authz/guard";
import { listAuthorOptions, listCategories, REVISION_REASONS } from "@/server/blog/service";

export const metadata: Metadata = { title: "Novo artigo" };

export default async function NewArticlePage() {
  const user = await requirePermission("blog.create", "/cms/blog/novo");
  const [categories, authors] = await Promise.all([listCategories(), can(user, "blog.edit_any") ? listAuthorOptions() : Promise.resolve(null)]);
  return (
    <div>
      <PageHeader
        back={
          <Link href="/cms/blog" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Blog
          </Link>
        }
        title="Novo artigo"
        description="O artigo começa como rascunho. Nada aparece no site antes da revisão e da publicação."
      />
      <ArticleEditor
        id={null}
        initial={{
          data: {
            title: "",
            slug: "",
            subtitle: "",
            excerpt: "",
            content: EMPTY_DOCUMENT,
            categoryId: null,
            authorId: null,
            coverMediaId: null,
            coverAlt: "",
            coverCaption: "",
            seoTitle: "",
            seoDescription: "",
            featured: false,
          },
          version: 0,
          status: "draft",
          hasChanges: false,
          publishedSlug: null,
          scheduledAt: null,
          updatedAt: null,
        }}
        canEdit
        actions={[]}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        authors={authors}
        media={{}}
        perms={{ canUpload: true, canFeature: can(user, "blog.publish"), canDelete: false, canComment: false }}
        comments={[]}
        revisions={[]}
        revisionReasons={REVISION_REASONS}
      />
    </div>
  );
}
