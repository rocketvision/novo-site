import type { Metadata } from "next";
import { SectionEditor } from "@/components/cms/content/section-editor";
import { PageHeader } from "@/components/cms/ui/layout";
import { requirePermission } from "@/server/authz/guard";
import { loadEditor } from "@/server/content/editor";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requirePermission("settings.view", "/cms/configuracoes");
  const { initial, media } = await loadEditor("site");

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações" description="Dados do site usados em todas as páginas: buscadores, contato, redes sociais e rodapé." />
      <SectionEditor
        sectionKey="site"
        label="Configurações do site"
        initial={initial}
        media={media}
        previewPath="/"
        perms={{
          canEdit: user.permissions.has("settings.edit"),
          canPublish: user.permissions.has("settings.publish"),
          canUpload: user.permissions.has("media.upload"),
        }}
      />
    </div>
  );
}
