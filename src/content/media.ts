/**
 * Fotografia da landing page.
 *
 * Imports estáticos: o Next.js conhece as dimensões (sem layout shift),
 * gera placeholder de blur e serve AVIF/WebP redimensionado.
 * Origem e licença de cada foto: src/assets/images/CREDITS.md
 */

import cafeCounterNight from "@/assets/images/cafe-counter-night.jpg";
import orderTicketsRail from "@/assets/images/order-tickets-rail.jpg";
import shopWindowNight from "@/assets/images/shop-window-night.jpg";
import customerPhoneNight from "@/assets/images/customer-phone-night.jpg";
import sketchToApp from "@/assets/images/sketch-to-app.jpg";
import cafeLaptopWindow from "@/assets/images/cafe-laptop-window.jpg";
import packingOrder from "@/assets/images/packing-order.jpg";
import warehouseTerminal from "@/assets/images/warehouse-terminal.jpg";
import salonPhone from "@/assets/images/salon-phone.jpg";
import logoSketches from "@/assets/images/logo-sketches.jpg";
import sketchingTogether from "@/assets/images/sketching-together.jpg";
import firstConversation from "@/assets/images/first-conversation.jpg";
import productBrief from "@/assets/images/product-brief.jpg";
import buildingTogether from "@/assets/images/building-together.jpg";
import cafePhonePayment from "@/assets/images/cafe-phone-payment.jpg";
import twoChairsWindow from "@/assets/images/two-chairs-window.jpg";
import type { StaticImageData } from "next/image";
import type { FallbackKey } from "@/lib/content/schemas";

export type Photo = { src: StaticImageData; alt: string };

export const media = {
  hero: { src: cafeCounterNight, alt: "Mulher sozinha atrás do balcão de um pequeno café, à noite" },
  shift: [
    { src: orderTicketsRail, alt: "Comandas de pedidos presas em fila no trilho de uma cozinha" },
    { src: shopWindowNight, alt: "Vitrine de uma loja iluminada à noite, com a porta aberta e os produtos expostos" },
    { src: customerPhoneNight, alt: "Homem consultando o celular na calçada, em frente a uma loja, à noite" },
  ],
  statement: { src: sketchToApp, alt: "Mão usando um aplicativo no celular sobre folhas com os rascunhos das telas" },
  services: {
    site: { src: cafeLaptopWindow, alt: "Homem usando o notebook na mesa de um café, junto a uma janela grande" },
    store: { src: packingOrder, alt: "Mãos acomodando um produto embrulhado em papel de seda dentro de uma caixa de envio" },
    system: { src: warehouseTerminal, alt: "Funcionária usando o sistema no computador dentro de um depósito" },
    app: { src: salonPhone, alt: "Mulher consultando o celular na cadeira de um salão de beleza, refletida no espelho" },
    brand: { src: logoSketches, alt: "Folhas com esboços de logotipo desenhados a lápis" },
  },
  differentials: { src: sketchingTogether, alt: "Duas pessoas à mesa, uma delas desenhando no papel as telas de um aplicativo" },
  workflow: [
    { src: firstConversation, alt: "Duas pessoas conversando à mesa, uma explicando e a outra tomando notas" },
    { src: productBrief, alt: "Folhas com o briefing do produto, os objetivos dos usuários e o fluxo das telas" },
    { src: buildingTogether, alt: "Duas pessoas concentradas nas telas do computador, trabalhando lado a lado" },
    { src: cafePhonePayment, alt: "Cliente pagando pelo celular no balcão de um café" },
  ],
  cta: { src: twoChairsWindow, alt: "Duas cadeiras e uma mesa pequena junto a uma janela iluminada pelo sol" },
} satisfies Record<string, Photo | Photo[] | Record<string, Photo>>;

/**
 * Fotos originais de direção de arte, usadas quando o CMS não define outra imagem.
 * As chaves são referenciadas pelo campo `fallback` das imagens de seção.
 */
export const FALLBACK_IMAGES: Record<FallbackKey, Photo> = {
  hero: media.hero,
  "shift-0": media.shift[0],
  "shift-1": media.shift[1],
  "shift-2": media.shift[2],
  statement: media.statement,
  "service-site": media.services.site,
  "service-store": media.services.store,
  "service-system": media.services.system,
  "service-app": media.services.app,
  "service-brand": media.services.brand,
  differentials: media.differentials,
  "workflow-0": media.workflow[0],
  "workflow-1": media.workflow[1],
  "workflow-2": media.workflow[2],
  "workflow-3": media.workflow[3],
  cta: media.cta,
};
