/**
 * Portfólio da Rocket Vision (rota /projetos).
 *
 * CONFIRMAR: todos os projetos abaixo são EXEMPLOS (sample: true) para validar o layout.
 * As telas foram desenhadas para este site; marcas, pessoas e dados são fictícios.
 * Enquanto existir algum exemplo, a página exibe o selo "Projeto de exemplo",
 * fica fora do sitemap e pede aos buscadores para não indexá-la.
 * Substitua por projetos reais, com autorização dos clientes, e remova o sample.
 */

import auroraDashboard from "@/assets/images/projects/aurora-dashboard.jpg";
import vittaHome from "@/assets/images/projects/vitta-home.jpg";
import vittaAgenda from "@/assets/images/projects/vitta-agenda.jpg";
import barroStore from "@/assets/images/projects/barro-store.jpg";
import barroProduct from "@/assets/images/projects/barro-product.jpg";
import norteCrm from "@/assets/images/projects/norte-crm.jpg";
import arcoSite from "@/assets/images/projects/arco-site.jpg";
import arcoMobile from "@/assets/images/projects/arco-mobile.jpg";
import saborMenu from "@/assets/images/projects/sabor-menu.jpg";
import saborTrack from "@/assets/images/projects/sabor-track.jpg";
import type { StaticImageData } from "next/image";

export type Screen = { src: StaticImageData; alt: string };

export type Project = {
  slug: string;
  /** Nome da marca do cliente. */
  name: string;
  category: string;
  year: string;
  summary: string;
  services: string[];
  highlights: string[];
  /** Cena do cartão: cor de fundo, tom do texto e cor de destaque. */
  theme: { bg: string; tone: "light" | "dark"; accent: string };
  screens: { desktop?: Screen; phones?: Screen[] };
  /** Projeto de exemplo, ainda não real. */
  sample: boolean;
};

export const projectsPage = {
  eyebrow: "Projetos",
  title: "Trabalho que fala por si.",
  lead: "Sistemas, aplicativos, lojas e sites que desenhamos e construímos. Cada um começou com uma conversa sobre um problema real.",
  cta: {
    title: "Seu projeto pode ser o próximo.",
    body: "Conte o que sua empresa precisa. A gente mostra o caminho mais claro para tirar a ideia do papel.",
    label: "Quero falar sobre meu projeto",
  },
};

export const projects: Project[] = [
  {
    slug: "aurora",
    name: "Aurora Distribuidora",
    category: "Sistema de gestão",
    year: "2026",
    summary: "Pedidos, estoque e expedição em um só painel, no lugar de cinco planilhas que ninguém mais confiava.",
    services: ["Sistema web", "Automações", "Integração fiscal"],
    highlights: ["Reposição de estoque sugerida automaticamente", "Pedidos acompanhados do balcão à entrega", "Relatórios diários sem trabalho manual"],
    theme: { bg: "#0b1f1d", tone: "light", accent: "#2dd4bf" },
    screens: { desktop: { src: auroraDashboard, alt: "Painel de gestão da Aurora com pedidos, faturamento e estoque crítico" } },
    sample: true,
  },
  {
    slug: "vitta",
    name: "Clínica Vitta",
    category: "Aplicativo",
    year: "2026",
    summary: "Aplicativo de agendamento que tirou as marcações do telefone e reduziu as faltas com lembretes automáticos.",
    services: ["App iOS e Android", "Design de produto", "Painel da recepção"],
    highlights: ["Agenda em três toques", "Lembretes e confirmação automática", "Teleconsulta integrada"],
    theme: { bg: "#e8e7fb", tone: "dark", accent: "#4f46e5" },
    screens: {
      phones: [
        { src: vittaHome, alt: "Tela inicial do app da Clínica Vitta com a próxima consulta" },
        { src: vittaAgenda, alt: "Tela de escolha de horário no app da Clínica Vitta" },
      ],
    },
    sample: true,
  },
  {
    slug: "casa-barro",
    name: "Casa Barro",
    category: "Loja virtual",
    year: "2025",
    summary: "Loja virtual para um ateliê de cerâmica que vendia só por mensagem: catálogo, estoque e pagamento no mesmo lugar.",
    services: ["E-commerce", "Identidade digital", "Pagamento integrado"],
    highlights: ["Vendas o dia inteiro", "Frete calculado no carrinho", "Estoque sincronizado com o ateliê"],
    theme: { bg: "#ece3d8", tone: "dark", accent: "#9a5b3c" },
    screens: {
      desktop: { src: barroStore, alt: "Página inicial da loja virtual Casa Barro" },
      phones: [{ src: barroProduct, alt: "Página de produto da Casa Barro no celular" }],
    },
    sample: true,
  },
  {
    slug: "norte",
    name: "Norte Engenharia",
    category: "CRM comercial",
    year: "2025",
    summary: "Funil de vendas sob medida para obras corporativas, com propostas, visitas técnicas e próximos passos sugeridos.",
    services: ["Sistema web", "Automações", "Relatórios"],
    highlights: ["Oportunidades visíveis para todo o time", "Propostas geradas a partir de modelos", "Alertas de follow-up"],
    theme: { bg: "#0d1117", tone: "light", accent: "#60a5fa" },
    screens: { desktop: { src: norteCrm, alt: "Funil de vendas do CRM da Norte Engenharia" } },
    sample: true,
  },
  {
    slug: "arco",
    name: "Arco Arquitetura",
    category: "Site institucional",
    year: "2025",
    summary: "Site portfólio para um estúdio de arquitetura, com projetos editáveis e contato direto com o time.",
    services: ["Site", "Direção de arte", "SEO"],
    highlights: ["Projetos atualizados pelo próprio estúdio", "Carregamento rápido com fotos em alta", "Agendamento de conversa pelo site"],
    theme: { bg: "#d9d3c9", tone: "dark", accent: "#171513" },
    screens: {
      desktop: { src: arcoSite, alt: "Página inicial do site da Arco Arquitetura" },
      phones: [{ src: arcoMobile, alt: "Site da Arco Arquitetura no celular" }],
    },
    sample: true,
  },
  {
    slug: "sabor-ja",
    name: "Sabor Já",
    category: "Aplicativo de delivery",
    year: "2024",
    summary: "Cardápio digital e delivery próprio para uma hamburgueria da madrugada, sem pagar comissão a marketplaces.",
    services: ["App de pedidos", "Pagamento integrado", "Rastreamento"],
    highlights: ["Pedido e pagamento em menos de um minuto", "Entrega acompanhada em tempo real", "Cardápio atualizado pela cozinha"],
    theme: { bg: "#170d08", tone: "light", accent: "#ff6b2c" },
    screens: {
      phones: [
        { src: saborMenu, alt: "Cardápio do app Sabor Já" },
        { src: saborTrack, alt: "Acompanhamento da entrega no app Sabor Já" },
      ],
    },
    sample: true,
  },
];

export const hasSampleProjects = projects.some((p) => p.sample);
