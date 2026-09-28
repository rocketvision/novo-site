/**
 * Migra para o CMS os 6 projetos de exemplo que o site exibia (antes em src/content/projects.ts).
 *
 *   npm run db:seed-samples
 *
 * - Envia os prints embutidos para o armazenamento de mídia (Vercel Blob em produção),
 *   passando pela mesma validação de qualquer upload.
 * - Cria cada projeto já publicado e marcado como exemplo (selo "Projeto de exemplo",
 *   fora do sitemap e com noindex). Nenhum dado é inventado: é o mesmo conteúdo de hoje.
 * - Idempotente: projetos cujo endereço já existe são ignorados.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { uploadMedia } from "@/server/media/service";
import { createProject, publishProject } from "@/server/projects/service";
import type { ProjectInput } from "@/lib/validation/projects";

type Sample = {
  slug: string;
  name: string;
  category: string;
  year: string;
  summary: string;
  services: string[];
  highlights: string[];
  theme: { bg: string; tone: "light" | "dark"; accent: string };
  desktop?: { file: string; alt: string };
  phones: { file: string; alt: string }[];
};

// Mesmo conteúdo que estava em src/content/projects.ts, com os arquivos das telas.
const SAMPLES: Sample[] = [
  {
    slug: "aurora", name: "Aurora Distribuidora", category: "Sistema de gestão", year: "2026",
    summary: "Pedidos, estoque e expedição em um só painel, no lugar de cinco planilhas que ninguém mais confiava.",
    services: ["Sistema web", "Automações", "Integração fiscal"],
    highlights: ["Reposição de estoque sugerida automaticamente", "Pedidos acompanhados do balcão à entrega", "Relatórios diários sem trabalho manual"],
    theme: { bg: "#0b1f1d", tone: "light", accent: "#2dd4bf" },
    desktop: { file: "aurora-dashboard.jpg", alt: "Painel de gestão da Aurora com pedidos, faturamento e estoque crítico" },
    phones: [],
  },
  {
    slug: "vitta", name: "Clínica Vitta", category: "Aplicativo", year: "2026",
    summary: "Aplicativo de agendamento que tirou as marcações do telefone e reduziu as faltas com lembretes automáticos.",
    services: ["App iOS e Android", "Design de produto", "Painel da recepção"],
    highlights: ["Agenda em três toques", "Lembretes e confirmação automática", "Teleconsulta integrada"],
    theme: { bg: "#e8e7fb", tone: "dark", accent: "#4f46e5" },
    phones: [
      { file: "vitta-home.jpg", alt: "Tela inicial do app da Clínica Vitta com a próxima consulta" },
      { file: "vitta-agenda.jpg", alt: "Tela de escolha de horário no app da Clínica Vitta" },
    ],
  },
  {
    slug: "casa-barro", name: "Casa Barro", category: "Loja virtual", year: "2025",
    summary: "Loja virtual para um ateliê de cerâmica que vendia só por mensagem: catálogo, estoque e pagamento no mesmo lugar.",
    services: ["E-commerce", "Identidade digital", "Pagamento integrado"],
    highlights: ["Vendas o dia inteiro", "Frete calculado no carrinho", "Estoque sincronizado com o ateliê"],
    theme: { bg: "#ece3d8", tone: "dark", accent: "#9a5b3c" },
    desktop: { file: "barro-store.jpg", alt: "Página inicial da loja virtual Casa Barro" },
    phones: [{ file: "barro-product.jpg", alt: "Página de produto da Casa Barro no celular" }],
  },
  {
    slug: "norte", name: "Norte Engenharia", category: "CRM comercial", year: "2025",
    summary: "Funil de vendas sob medida para obras corporativas, com propostas, visitas técnicas e próximos passos sugeridos.",
    services: ["Sistema web", "Automações", "Relatórios"],
    highlights: ["Oportunidades visíveis para todo o time", "Propostas geradas a partir de modelos", "Alertas de follow-up"],
    theme: { bg: "#0d1117", tone: "light", accent: "#60a5fa" },
    desktop: { file: "norte-crm.jpg", alt: "Funil de vendas do CRM da Norte Engenharia" },
    phones: [],
  },
  {
    slug: "arco", name: "Arco Arquitetura", category: "Site institucional", year: "2025",
    summary: "Site portfólio para um estúdio de arquitetura, com projetos editáveis e contato direto com o time.",
    services: ["Site", "Direção de arte", "SEO"],
    highlights: ["Projetos atualizados pelo próprio estúdio", "Carregamento rápido com fotos em alta", "Agendamento de conversa pelo site"],
    theme: { bg: "#d9d3c9", tone: "dark", accent: "#171513" },
    desktop: { file: "arco-site.jpg", alt: "Página inicial do site da Arco Arquitetura" },
    phones: [{ file: "arco-mobile.jpg", alt: "Site da Arco Arquitetura no celular" }],
  },
  {
    slug: "sabor-ja", name: "Sabor Já", category: "Aplicativo de delivery", year: "2024",
    summary: "Cardápio digital e delivery próprio para uma hamburgueria da madrugada, sem pagar comissão a marketplaces.",
    services: ["App de pedidos", "Pagamento integrado", "Rastreamento"],
    highlights: ["Pedido e pagamento em menos de um minuto", "Entrega acompanhada em tempo real", "Cardápio atualizado pela cozinha"],
    theme: { bg: "#170d08", tone: "light", accent: "#ff6b2c" },
    phones: [
      { file: "sabor-menu.jpg", alt: "Cardápio do app Sabor Já" },
      { file: "sabor-track.jpg", alt: "Acompanhamento da entrega no app Sabor Já" },
    ],
  },
];

const ctx = { ip: null, userAgent: "seed-samples" };
const IMAGES = path.join(process.cwd(), "src/assets/images/projects");

async function main() {
  const db = getDb();
  const [owner] = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.roles.key, "owner"))
    .orderBy(schema.users.createdAt)
    .limit(1);
  if (!owner) throw new Error("Crie o owner antes (npm run cms:bootstrap-owner). Os exemplos ficam registrados em nome dele.");

  for (const [order, sample] of SAMPLES.entries()) {
    const exists = await db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.slug, sample.slug)).limit(1);
    if (exists.length) {
      console.log(`= ${sample.slug} já existe, ignorado`);
      continue;
    }

    const upload = async (screen: { file: string; alt: string }) =>
      (await uploadMedia(owner, { buffer: await readFile(path.join(IMAGES, screen.file)), filename: screen.file, alt: screen.alt }, ctx)).media.id;

    const desktopMediaId = sample.desktop ? await upload(sample.desktop) : null;
    const phoneMediaIds = [];
    for (const phone of sample.phones) phoneMediaIds.push(await upload(phone));

    const input: ProjectInput = {
      name: sample.name,
      slug: sample.slug,
      client: "",
      category: sample.category,
      projectDate: `${sample.year}-01-01`,
      summary: sample.summary,
      description: "",
      context: "",
      solution: "",
      results: "",
      services: sample.services,
      highlights: sample.highlights,
      brandColor: sample.theme.bg,
      accentColor: sample.theme.accent,
      tone: sample.theme.tone,
      coverMediaId: desktopMediaId ?? phoneMediaIds[0] ?? null,
      logoMediaId: null,
      ogMediaId: null,
      desktopMediaId,
      phoneMediaIds,
      gallery: [],
      externalUrl: "",
      seoTitle: "",
      seoDescription: "",
      featured: false,
    };

    const created = await createProject(owner, input, ctx);
    await db.update(schema.projects).set({ isSample: true, sortOrder: order + 1 }).where(eq(schema.projects.id, created.id));
    const [{ version }] = await db.select({ version: schema.projects.version }).from(schema.projects).where(eq(schema.projects.id, created.id));
    await publishProject(owner, created.id, version, ctx);
    console.log(`+ ${sample.slug} criado e publicado como exemplo`);
  }

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(schema.projects);
  console.log(`Pronto. ${total} projeto(s) no CMS.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
