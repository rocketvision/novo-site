/**
 * Portfólio da Rocket Vision (rota /projetos).
 *
 * CONFIRMAR: todos os projetos abaixo são EXEMPLOS (sample: true) para validar o layout.
 * Enquanto existir algum exemplo, a página exibe o selo "Projeto de exemplo",
 * fica fora do sitemap e pede aos buscadores para não indexá-la.
 * Substitua por projetos reais, com autorização dos clientes, e remova o sample.
 */

import foodTruck from "@/assets/images/projects/food-truck.jpg";
import fashionStore from "@/assets/images/projects/fashion-store.jpg";
import warehouse from "@/assets/images/projects/warehouse.jpg";
import studioBrand from "@/assets/images/projects/studio-brand.jpg";
import spiceShop from "@/assets/images/projects/spice-shop.jpg";
import foodApp from "@/assets/images/projects/food-app.jpg";
import type { StaticImageData } from "next/image";

export type Project = {
  slug: string;
  name: string;
  client: string;
  category: string;
  year: string;
  summary: string;
  services: string[];
  highlights: string[];
  image: { src: StaticImageData; alt: string; position?: string };
  /** Projeto de exemplo, ainda não real. */
  sample: boolean;
};

export const projectsPage = {
  eyebrow: "Projetos",
  title: "Trabalho que fala por si.",
  lead: "Alguns dos produtos que desenhamos e construímos. Cada um começou com uma conversa sobre um problema real.",
  cta: {
    title: "Seu projeto pode ser o próximo.",
    body: "Conte o que sua empresa precisa. A gente mostra o caminho mais claro para tirar a ideia do papel.",
    label: "Quero falar sobre meu projeto",
  },
};

export const projects: Project[] = [
  {
    slug: "burger-noturno",
    name: "Pedido na janela",
    client: "Food truck (exemplo)",
    category: "Aplicativo",
    year: "2026",
    summary: "Cardápio digital e pedidos pelo celular para um food truck que atende até de madrugada.",
    services: ["Aplicativo", "Pagamento integrado"],
    highlights: ["Fila organizada por pedido", "Pagamento antes da retirada", "Cardápio atualizado na hora"],
    image: { src: foodTruck, alt: "Atendente em um food truck iluminado à noite" },
    sample: true,
  },
  {
    slug: "atelie-envios",
    name: "Loja do ateliê",
    client: "Moda artesanal (exemplo)",
    category: "Loja virtual",
    year: "2026",
    summary: "Loja virtual com estoque, envios e pagamento integrado para uma marca que vendia só por mensagem.",
    services: ["Loja virtual", "Identidade visual"],
    highlights: ["Vendas o dia inteiro", "Etiquetas de envio automáticas", "Estoque sempre certo"],
    image: { src: fashionStore, alt: "Empreendedora conferindo um pedido embalado ao lado do notebook", position: "50% 40%" },
    sample: true,
  },
  {
    slug: "distribuidora-estoque",
    name: "Estoque em tempo real",
    client: "Distribuidora (exemplo)",
    category: "Sistema sob medida",
    year: "2025",
    summary: "Sistema web para controle de estoque e expedição, substituindo as planilhas espalhadas pela equipe.",
    services: ["Sistema web", "Automações"],
    highlights: ["Um só lugar para o estoque", "Relatórios gerados sozinhos", "Acesso pelo tablet no galpão"],
    image: { src: warehouse, alt: "Gestor com tablet sentado em um centro de distribuição", position: "50% 18%" },
    sample: true,
  },
  {
    slug: "estudio-marca",
    name: "Uma marca com assinatura",
    client: "Estúdio de design (exemplo)",
    category: "Identidade visual",
    year: "2025",
    summary: "Identidade visual completa e site portfólio para um estúdio independente de ilustração.",
    services: ["Identidade visual", "Site"],
    highlights: ["Logotipo e sistema de cores", "Guia de aplicação", "Site com portfólio editável"],
    image: { src: studioBrand, alt: "Designer desenhando em uma mesa digitalizadora no estúdio", position: "50% 35%" },
    sample: true,
  },
  {
    slug: "emporio-catalogo",
    name: "O empório no bolso",
    client: "Empório de especiarias (exemplo)",
    category: "Catálogo digital",
    year: "2025",
    summary: "Catálogo digital com todo o mix de produtos e pedidos pelo WhatsApp já organizados por cliente.",
    services: ["Catálogo digital", "Site"],
    highlights: ["Busca por produto", "Pedido pronto para separar", "Fácil de atualizar"],
    image: { src: spiceShop, alt: "Corredor estreito de um empório repleto de potes de especiarias", position: "50% 55%" },
    sample: true,
  },
  {
    slug: "app-cardapio",
    name: "Coleções que dão fome",
    client: "Marca de alimentos (exemplo)",
    category: "Aplicativo",
    year: "2024",
    summary: "Aplicativo de receitas e compras para uma marca de alimentos naturais.",
    services: ["Aplicativo", "Design de produto"],
    highlights: ["Compra em poucos toques", "Coleções por ocasião", "Base pronta para crescer"],
    image: { src: foodApp, alt: "Mão segurando um celular com um aplicativo de coleções de alimentos", position: "50% 45%" },
    sample: true,
  },
];

export const hasSampleProjects = projects.some((p) => p.sample);
