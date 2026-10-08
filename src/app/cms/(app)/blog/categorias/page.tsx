import type { Metadata } from "next";
import { PageHeader } from "@/components/cms/ui/layout";
import { CategoriesAdmin } from "@/components/cms/blog/taxonomy-admin";
import { requirePermission } from "@/server/authz/guard";
import { listCategories } from "@/server/blog/service";

export const metadata: Metadata = { title: "Categorias do Blog" };

export default async function BlogCategoriesPage() {
  await requirePermission("blog.categories", "/cms/blog/categorias");
  const categories = await listCategories();
  return (
    <div>
      <PageHeader title="Categorias" description="Categorias organizam o Blog e ganham página própria quando têm artigos publicados." />
      <CategoriesAdmin categories={categories} />
    </div>
  );
}
