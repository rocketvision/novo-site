/**
 * Fotografia da landing page.
 *
 * Imports estáticos: o Next.js conhece as dimensões (sem layout shift),
 * gera placeholder de blur e serve AVIF/WebP redimensionado.
 * Origem e licença de cada foto: src/assets/images/CREDITS.md
 */

import lateOffice from "@/assets/images/late-office.jpg";
import spreadsheetDesk from "@/assets/images/spreadsheet-desk.jpg";
import shopCounter from "@/assets/images/shop-counter.jpg";
import phoneHandsDark from "@/assets/images/phone-hands-dark.jpg";
import laptopLight from "@/assets/images/laptop-light.jpg";
import serviceSite from "@/assets/images/service-site.jpg";
import serviceStore from "@/assets/images/service-store.jpg";
import serviceSystem from "@/assets/images/service-system.jpg";
import serviceApp from "@/assets/images/service-app.jpg";
import serviceBrand from "@/assets/images/service-brand.jpg";
import teamWall from "@/assets/images/team-wall.jpg";
import stepTalk from "@/assets/images/step-talk.jpg";
import stepPlan from "@/assets/images/step-plan.jpg";
import stepBuild from "@/assets/images/step-build.jpg";
import stepEvolve from "@/assets/images/step-evolve.jpg";
import nightDesk from "@/assets/images/night-desk.jpg";
import type { StaticImageData } from "next/image";

export type Photo = { src: StaticImageData; alt: string };

export const media = {
  hero: { src: lateOffice, alt: "Pessoa trabalhando sozinha até tarde em um escritório escuro" },
  shift: [
    { src: spreadsheetDesk, alt: "Mão no notebook com uma planilha aberta sobre a mesa" },
    { src: shopCounter, alt: "Lojista atendendo no balcão de uma loja pequena" },
    { src: phoneHandsDark, alt: "Mãos segurando um celular em um ambiente escuro" },
  ],
  statement: { src: laptopLight, alt: "Notebook com código na tela, iluminado pela luz da tarde" },
  services: {
    site: { src: serviceSite, alt: "Mesa de trabalho com computador e notebook exibindo um site" },
    store: { src: serviceStore, alt: "Empreendedora montando caixas de envio em um ateliê iluminado" },
    system: { src: serviceSystem, alt: "Gestor usando um tablet dentro de um centro de distribuição" },
    app: { src: serviceApp, alt: "Mãos usando um aplicativo no celular" },
    brand: { src: serviceBrand, alt: "Papelaria de identidade visual organizada sobre a mesa" },
  },
  differentials: { src: teamWall, alt: "Duas pessoas organizando um plano com notas adesivas em uma parede de vidro" },
  workflow: [
    { src: stepTalk, alt: "Duas pessoas conversando à mesa com xícaras de café" },
    { src: stepPlan, alt: "Mão desenhando wireframes de telas no papel" },
    { src: stepBuild, alt: "Notebook com código de um projeto aberto" },
    { src: stepEvolve, alt: "Pessoa usando um aplicativo no celular" },
  ],
  cta: { src: nightDesk, alt: "Mesa com luminária acesa diante da cidade à noite" },
} satisfies Record<string, Photo | Photo[] | Record<string, Photo>>;
