import type { Metadata } from "next";
import { PageHeader } from "@/components/cms/ui/layout";
import { BlogNav } from "@/components/cms/blog/blog-nav";
import { OwnProfileForm } from "@/components/cms/blog/taxonomy-admin";
import { can, requirePermission } from "@/server/authz/guard";
import { getOwnAuthor } from "@/server/blog/service";
import { getMediaByIds } from "@/server/media/service";

export const metadata: Metadata = { title: "Meu perfil de autor" };

export default async function OwnAuthorPage() {
  const user = await requirePermission("blog.create", "/cms/blog/perfil");
  const author = await getOwnAuthor(user);
  const photo = author?.photoMediaId ? (await getMediaByIds([author.photoMediaId])).get(author.photoMediaId) : undefined;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Blog" description="Foto, bio e links que aparecem junto aos seus artigos." />
      <BlogNav current="perfil" show={{ categories: can(user, "blog.categories"), authors: can(user, "blog.authors"), profile: true }} />
      <OwnProfileForm
        initial={{
          name: author?.name ?? user.name,
          roleTitle: author?.roleTitle ?? "",
          bio: author?.bio ?? "",
          photoMediaId: author?.photoMediaId ?? null,
          links: (author?.links as { label: string; url: string }[] | undefined) ?? [],
        }}
        version={author?.version ?? null}
        photoUrl={photo?.url ?? null}
        affiliation={author?.affiliation ?? null}
        slug={author?.slug ?? null}
      />
    </div>
  );
}
