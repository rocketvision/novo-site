/**
 * Conteúdo inicial de cada seção, construído a partir da copy aprovada (src/content/landing.ts e src/lib/site.ts).
 *
 * Usado em dois momentos:
 * 1. No seed, para criar as seções no banco já publicadas com o conteúdo atual do site.
 * 2. Como rede de segurança: se o banco estiver indisponível, a landing continua exibindo este conteúdo.
 *
 * As imagens apontam para as fotos originais pela chave `fallback` (ver FALLBACK_IMAGES em src/content/media.ts).
 * O texto alternativo fica vazio: assim vale o da própria foto original, que muda junto com ela.
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

const img = (fallback: FallbackKey) => ({ mediaId: null, alt: "", fallback });

export const DEFAULT_CONTENT: { [K in SectionKey]: SectionContent<K> } = {
  hero: {
    eyebrow: hero.eyebrow,
    titleLines: [...hero.title],
    lead: hero.lead,
    primaryCta: { label: hero.primaryCta, href: "#contato" },
    secondaryCta: { label: hero.secondaryCta, href: "#servicos" },
    image: img("hero"),
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
      pairs: shift.items.slice(g * 2, g * 2 + 2).map((p) => ({ before: p.before, after: p.after })),
    })),
  },
  statement: {
    title: statement.title,
    body: statement.body,
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
    })),
  },
  differentials: {
    eyebrow: differentials.eyebrow,
    title: differentials.title,
    items: differentials.items.map((i) => ({ title: i.title, body: i.body })),
    image: img("differentials"),
  },
  workflow: {
    eyebrow: workflow.eyebrow,
    title: workflow.title,
    lead: workflow.lead,
    steps: workflow.steps.map((s) => ({ name: s.name, title: s.title, body: s.body })),
    image: img("workflow"),
  },
  turn: { from: turn.from, strike: "complicar", to: turn.to },
  cta: {
    eyebrow: cta.eyebrow,
    titleLines: [...cta.title],
    lead: cta.lead,
    submit: cta.submit,
    interests: [...cta.interests],
    reassurance: cta.reassurance,
    image: img("cta"),
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
