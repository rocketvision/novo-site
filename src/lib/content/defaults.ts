/**
 * Conteúdo inicial de cada seção, construído a partir da copy aprovada (src/content/landing.ts e src/lib/site.ts).
 *
 * Usado em dois momentos:
 * 1. No seed, para criar as seções no banco já publicadas com o conteúdo atual do site.
 * 2. Como rede de segurança: se o banco estiver indisponível, a landing continua exibindo este conteúdo.
 *
 * As imagens apontam para as fotos originais pela chave `fallback` (ver FALLBACK_IMAGES em src/content/media.ts).
 */

import {
  cta,
  differentials,
  hero,
  problem,
  projectsPage,
  services,
  shift,
  statement,
  turn,
  workflow,
} from "@/content/landing";
import { site } from "@/lib/site";
import type { FallbackKey, SectionContent, SectionKey } from "./schemas";

const img = (fallback: FallbackKey, alt: string) => ({ mediaId: null, alt, fallback });

const serviceFallback: Record<string, FallbackKey> = {
  site: "service-site",
  store: "service-store",
  system: "service-system",
  app: "service-app",
  brand: "service-brand",
};

const serviceAlt: Record<string, string> = {
  site: "Homem usando o notebook na mesa de um café, junto a uma janela grande",
  store: "Mãos acomodando um produto embrulhado em papel de seda dentro de uma caixa de envio",
  system: "Funcionária usando o sistema no computador dentro de um depósito",
  app: "Mulher consultando o celular na cadeira de um salão de beleza, refletida no espelho",
  brand: "Folhas com esboços de logotipo desenhados a lápis",
};

const shiftAlts = [
  "Comandas de pedidos presas em fila no trilho de uma cozinha",
  "Vitrine de uma loja iluminada à noite, com a porta aberta e os produtos expostos",
  "Homem consultando o celular na calçada, em frente a uma loja, à noite",
];

const workflowAlts = [
  "Duas pessoas conversando à mesa, uma explicando e a outra tomando notas",
  "Folhas com o briefing do produto, os objetivos dos usuários e o fluxo das telas",
  "Duas pessoas concentradas nas telas do computador, trabalhando lado a lado",
  "Cliente pagando pelo celular no balcão de um café",
];

export const DEFAULT_CONTENT: { [K in SectionKey]: SectionContent<K> } = {
  hero: {
    eyebrow: hero.eyebrow,
    titleLines: [...hero.title],
    lead: hero.lead,
    primaryCta: { label: hero.primaryCta, href: "#contato" },
    secondaryCta: { label: hero.secondaryCta, href: "#servicos" },
    image: img("hero", "Mulher sozinha atrás do balcão de um pequeno café, à noite"),
  },
  problem: {
    eyebrow: problem.eyebrow,
    symptoms: problem.symptoms.map((s) => ({ kind: s.kind, text: s.text, artifact: s.artifact, meta: s.meta })),
    conclusion: [problem.conclusion[0], problem.conclusion[1]],
  },
  shift: {
    eyebrow: shift.eyebrow,
    title: shift.title,
    groups: [0, 1, 2].map((g) => ({
      image: img(`shift-${g}` as FallbackKey, shiftAlts[g]),
      pairs: shift.items.slice(g * 2, g * 2 + 2).map((p) => ({ before: p.before, after: p.after })),
    })),
  },
  statement: {
    title: statement.title,
    body: statement.body,
    image: img("statement", "Mão usando um aplicativo no celular sobre folhas com os rascunhos das telas"),
  },
  services: {
    eyebrow: services.eyebrow,
    title: services.title,
    lead: services.lead,
    items: services.items.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title,
      problem: s.problem,
      what: s.what,
      outcomes: [...s.outcomes],
      signal: s.signal,
      image: img(serviceFallback[s.visual], serviceAlt[s.visual]),
    })),
  },
  differentials: {
    eyebrow: differentials.eyebrow,
    title: differentials.title,
    items: differentials.items.map((i) => ({ title: i.title, body: i.body })),
    image: img("differentials", "Duas pessoas à mesa, uma delas desenhando no papel as telas de um aplicativo"),
  },
  workflow: {
    eyebrow: workflow.eyebrow,
    title: workflow.title,
    lead: workflow.lead,
    steps: workflow.steps.map((s, i) => ({
      name: s.name,
      title: s.title,
      body: s.body,
      image: img(`workflow-${i}` as FallbackKey, workflowAlts[i]),
    })),
  },
  turn: { from: turn.from, strike: "complicar", to: turn.to },
  cta: {
    eyebrow: cta.eyebrow,
    titleLines: [...cta.title],
    lead: cta.lead,
    submit: cta.submit,
    interests: [...cta.interests],
    reassurance: cta.reassurance,
    image: img("cta", "Duas cadeiras e uma mesa pequena junto a uma janela iluminada pelo sol"),
  },
  projectsPage: {
    eyebrow: projectsPage.eyebrow,
    title: projectsPage.title,
    lead: projectsPage.lead,
    cta: { ...projectsPage.cta },
  },
  site: {
    seo: { title: site.title, description: site.description },
    footerTagline: "Sites, lojas virtuais, sistemas e aplicativos para empresas que querem crescer com organização.",
    contact: { email: site.contact.email, phone: site.contact.phone, whatsapp: site.contact.whatsapp },
    social: site.social.map((s) => ({ label: s.label, href: s.href })),
    legal: { companyName: site.legal.companyName, cnpj: site.legal.cnpj },
  },
};
