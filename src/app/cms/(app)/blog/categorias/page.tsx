import type { Metadata } from "next";
import { PageHeader } from "@/components/cms/ui/layout";
import { BlogNav } from "@/components/cms/blog/blog-nav";
import { CategoriesAdmin } from "@/components/cms/blog/taxonomy-admin";
import { can, requirePermission } from "@/server/authz/guard";
import { listCategories } from "@/server/blog/service";

export const metadata: Metadata = { title: "Categorias do Blog" };

export default async function BlogCategoriesPage() {
  const user = await requirePermission("blog.categories", "/cms/blog/categorias");
  const categories = await listCategories();
  return (
    <div className="max-w-4xl">
      <PageHeader title="Blog" description="Categorias organizam o Blog e ganham página própria quando têm artigos publicados." />
      <BlogNav current="categorias" show={{ categories: true, authors: can(user, "blog.authors"), profile: can(user, "blog.create") }} />
      <CategoriesAdmin categories={categories} />
    </div>
  );
}
