import type { Metadata } from "next";
import { PageHeader } from "@/components/cms/ui/layout";
import { AuthorsAdmin } from "@/components/cms/blog/taxonomy-admin";
import { requirePermission } from "@/server/authz/guard";
import { listAuthors, listLinkableUsers } from "@/server/blog/service";

export const metadata: Metadata = { title: "Autores do Blog" };

export default async function BlogAuthorsPage() {
  await requirePermission("blog.authors", "/cms/blog/autores");
  const [authors, users] = await Promise.all([listAuthors(), listLinkableUsers()]);
  return (
    <div>
      <PageHeader title="Autores" description="Perfis públicos de quem escreve. Colunistas externos aparecem como convidados, nunca como equipe." />
      <AuthorsAdmin
        authors={authors.map((a) => ({ ...a, links: (a.links as { label: string; url: string }[]) ?? [] }))}
        users={users}
      />
    </div>
  );
}
