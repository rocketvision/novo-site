import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { PartnerEditor } from "@/components/cms/alliance/partner-editor";
import type { PartnerInput } from "@/lib/alliance/validation";
import { requirePermission } from "@/server/authz/guard";
import { getDb, schema } from "@/server/db";

export const metadata: Metadata = { title: "Novo parceiro · Rocket Alliance" };

const EMPTY: PartnerInput = {
  tradeName: "",
  legalName: "",
  taxId: "",
  slug: "",
  status: "onboarding",
  tierKey: "member",
  modalities: ["referral"],
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  sector: "",
  shortDescription: "",
  description: "",
  specialties: [],
  services: [],
  websiteUrl: "",
  socialLinks: [],
  location: "",
  logoMediaId: null,
  logoAltMediaId: null,
  coverMediaId: null,
  ogMediaId: null,
  accentColor: "#2c9df5",
  gallery: [],
  projectIds: [],
  testimonials: [],
  seoTitle: "",
  seoDescription: "",
  showTier: false,
  managersInvite: false,
  qualityScore: null,
  satisfactionScore: null,
  complianceOk: true,
  internalNotes: "",
};

/** Cadastro manual de parceiro (para quem entrou sem passar pela candidatura do site). */
export default async function NewPartnerPage() {
  const user = await requirePermission("alliance.partners", "/cms/alliance/parceiros/novo");
  const projects = await getDb().select({ id: schema.projects.id, name: schema.projects.name, status: schema.projects.status }).from(schema.projects).orderBy(asc(schema.projects.name));
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/cms/alliance/parceiros" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Parceiros
          </Link>
        }
        title="Novo parceiro"
        description="O parceiro começa fora do diretório e sem acesso ao Alliance Hub."
      />
      <PartnerEditor
        id={null}
        initial={{ data: EMPTY, version: 0, published: false, hasChanges: false, publishedAt: null, publicSlug: null }}
        media={{}}
        projects={projects}
        perms={{ canEdit: true, canPublish: false, canUpload: user.permissions.has("media.upload") }}
      />
    </div>
  );
}
