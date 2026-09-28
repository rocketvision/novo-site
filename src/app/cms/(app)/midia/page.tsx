import type { Metadata } from "next";
import { PageHeader } from "@/components/cms/ui/layout";
import { MediaLibrary, type MediaFilter } from "@/components/cms/media/media-library";
import { SECTIONS } from "@/lib/content/sections";
import { mediaListQuerySchema } from "@/lib/validation/media";
import { requirePermission } from "@/server/authz/guard";
import { countMedia, listMedia } from "@/server/media/service";

export const metadata: Metadata = { title: "Mídia" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("media.view", "/cms/midia");
  const sp = await searchParams;
  const parsed = mediaListQuerySchema.safeParse({
    q: typeof sp.q === "string" ? sp.q : undefined,
    filter: typeof sp.filtro === "string" ? sp.filtro : undefined,
  });
  const q = parsed.success ? (parsed.data.q ?? "") : "";
  const filter: MediaFilter = parsed.success ? (parsed.data.filter ?? "all") : "all";

  const [page, total] = await Promise.all([listMedia({ q, filter }), countMedia()]);
  const sectionSlugs = Object.fromEntries(SECTIONS.map((s) => [s.key, s.slug]));

  return (
    <>
      <PageHeader
        title="Mídia"
        description={`${total === 1 ? "1 imagem" : `${total} imagens`} na biblioteca. JPG, PNG, WebP ou AVIF, até 10 MB.`}
      />
      <MediaLibrary
        key={`${q}|${filter}`}
        initial={page.items.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() }))}
        initialCursor={page.nextCursor}
        q={q}
        filter={filter}
        perms={{
          canUpload: user.permissions.has("media.upload"),
          canEdit: user.permissions.has("media.edit"),
          canDelete: user.permissions.has("media.delete"),
        }}
        sectionSlugs={sectionSlugs}
      />
    </>
  );
}
