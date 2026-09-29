import type { Metadata } from "next";
import { PageHeader } from "@/components/cms/ui/layout";
import { BlogNav } from "@/components/cms/blog/blog-nav";
import { AuthorsAdmin } from "@/components/cms/blog/taxonomy-admin";
import { can, requirePermission } from "@/server/authz/guard";
import { listAuthors, listLinkableUsers } from "@/server/blog/service";

export const metadata: Metadata = { title: "Autores do Blog" };

export default async function BlogAuthorsPage() {
  const user = await requirePermission("blog.authors", "/cms/blog/autores");
  const [authors, users] = await Promise.all([listAuthors(), listLinkableUsers()]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Blog" description="Perfis públicos de quem escreve. Colunistas externos aparecem como convidados, nunca como equipe." />
      <BlogNav current="autores" show={{ categories: can(user, "blog.categories"), authors: true, profile: can(user, "blog.create") }} />
      <AuthorsAdmin
        authors={authors.map((a) => ({ ...a, links: (a.links as { label: string; url: string }[]) ?? [] }))}
        users={users}
      />
    </div>
  );
}
