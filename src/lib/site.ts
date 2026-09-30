/**
 * Dados institucionais da Rocket Vision.
 *
 * Tudo marcado com "CONFIRMAR" precisa ser validado antes de ir para produção.
 * Campos vazios não são renderizados: nada aparece na página até existir um dado real.
 */

export const site = {
  name: "Rocket Vision",
  shortName: "Rocket",
  /** Slogan oficial. Aparece na assinatura do hero, no rodapé e nos metadados. */
  slogan: "Beyond the Vision.",
  // CONFIRMAR: domínio definitivo. O README cita beta.rocketvision.com.br.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://rocketvision.com.br",
  locale: "pt_BR",
  title: "Rocket Vision | Sites, sistemas e aplicativos para empresas",
  description:
    "A Rocket Vision cria sites, lojas virtuais, sistemas e aplicativos para empresas que querem vender mais, organizar a operação e crescer sem depender de improviso.",
  // CONFIRMAR: região de atuação. Extraída das palavras-chave do site anterior.
  region: ["Ipaussu", "Santa Cruz do Rio Pardo", "Ourinhos", "Canitar"],
  contact: {
    // CONFIRMAR: preencha com os canais reais. Campos vazios ficam ocultos.
    email: "",
    phone: "",
    /** Número no formato internacional, só dígitos. Ex.: 5514999999999 */
    whatsapp: "",
  } as { email: string; phone: string; whatsapp: string },
  /** CONFIRMAR: redes sociais reais. Lista vazia não renderiza nada. */
  social: [] as { label: string; href: string }[],
  legal: {
    // CONFIRMAR: razão social e CNPJ, se quiser exibir no rodapé.
    companyName: "",
    cnpj: "",
  } as { companyName: string; cnpj: string },
} as const;

export const nav = [
  { label: "Serviços", href: "/#servicos" },
  { label: "Projetos", href: "/projetos" },
  { label: "Blog", href: "/blog" },
  { label: "Planos", href: "/#planos" },
] as const;

export const primaryCta = { label: "Solicitar orçamento", href: "/#contato" } as const;
