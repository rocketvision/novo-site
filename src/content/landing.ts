/**
 * Conteúdo da landing page.
 *
 * Toda a copy vive aqui para facilitar revisão e edição sem mexer em componentes.
 * Regra da casa: nunca usar travessão. Use ponto, vírgula ou dois-pontos.
 *
 * Itens marcados com "CONFIRMAR" dependem de informação real da Rocket Vision.
 */

export const hero = {
  eyebrow: "Sites, lojas virtuais, sistemas e aplicativos",
  title: ["A tecnologia certa", "muda o rumo", "do seu negócio."],
  lead: "A Rocket Vision projeta e desenvolve a tecnologia que sua empresa precisa para vender mais, trabalhar com menos retrabalho e crescer com organização.",
  primaryCta: "Quero um orçamento",
  secondaryCta: "Ver o que fazemos",
};

export const problem = {
  eyebrow: "Parece familiar?",
  manifesto:
    "Planilhas que só uma pessoa entende. Pedidos anotados no WhatsApp. Um site que ninguém encontra. Uma ideia boa parada há meses. Sua empresa cresceu. As ferramentas dela, não.",
  /** Cada improviso vira um objeto reconhecível que cai sobre a cena. */
  symptoms: [
    { kind: "file", text: "Planilhas que só uma pessoa entende.", artifact: "controle_FINAL_v7 (2).xlsx", meta: "Última edição: 23:48" },
    { kind: "chat", text: "Pedidos anotados no WhatsApp.", artifact: "Oi! Vocês anotaram meu pedido de ontem?", meta: "+38 mensagens não lidas" },
    { kind: "search", text: "Um site que ninguém encontra.", artifact: "sua empresa", meta: "Página 6 dos resultados" },
    { kind: "note", text: "Uma ideia boa parada há meses.", artifact: "App de agendamento. Ver depois!!", meta: "" },
  ] as const,
  conclusion: ["Sua empresa cresceu.", "As ferramentas dela, não."],
};

export const shift = {
  eyebrow: "O que muda",
  title: "Cada improviso da sua operação pode virar um processo que funciona sozinho.",
  items: [
    {
      before: "Controle espalhado em planilhas",
      after: "Um sistema único, com a informação certa na hora certa.",
    },
    {
      before: "Pedidos e atendimentos perdidos no WhatsApp",
      after: "Um fluxo organizado, com histórico e responsável por cada etapa.",
    },
    {
      before: "Um site que não traz clientes",
      after: "Um site rápido, fácil de encontrar e feito para gerar contatos.",
    },
    {
      before: "Vendas que dependem do balcão",
      after: "Uma loja virtual aberta o dia inteiro, com pagamento integrado.",
    },
    {
      before: "A ideia do aplicativo que nunca saiu do papel",
      after: "Um produto real, nas mãos dos seus clientes.",
    },
    {
      before: "Tarefas repetitivas tomando o dia da equipe",
      after: "Automações que devolvem horas para o que realmente importa.",
    },
  ],
};

export const statement = {
  eyebrow: "Rocket Vision",
  title:
    "Transformamos o que sua empresa precisa em tecnologia que funciona. Da primeira conversa ao produto no ar.",
  body: "Unimos estratégia, design e desenvolvimento em um só time. Você explica o problema com as suas palavras. Nós cuidamos de transformar isso em algo claro, bonito e que funciona no dia a dia.",
};

/** Momento tipográfico: uma frase se desmonta e dá lugar à outra conforme o scroll. */
export const turn = {
  from: "Tecnologia não deveria complicar a sua empresa.",
  to: "Deveria fazer ela avançar.",
};

export type ServiceVisual = "site" | "store" | "system" | "app" | "brand";

export type Service = {
  id: string;
  name: string;
  title: string;
  problem: string;
  what: string;
  outcomes: string[];
  visual: ServiceVisual;
  /** Sinal de resultado exibido sobre a fotografia do serviço. */
  signal: string;
};

/**
 * CONFIRMAR: serviços extraídos do site anterior (palavras-chave: criação de sites,
 * lojas com PagSeguro e Mercado Pago, catálogos, sistemas, aplicativos, identidade visual).
 */
export const services: { eyebrow: string; title: string; lead: string; items: Service[] } = {
  eyebrow: "Serviços",
  title: "O que a Rocket constrói para você.",
  lead: "Cada serviço começa pelo resultado que sua empresa quer alcançar. A tecnologia é só o caminho.",
  items: [
    {
      id: "sites",
      name: "Sites",
      title: "Um site que trabalha pela sua empresa.",
      problem:
        "Seu site existe, mas não aparece no Google, demora para abrir e ninguém entra em contato por ele.",
      what: "Criamos sites institucionais e landing pages rápidos, bem escritos e pensados para transformar visitas em conversas.",
      outcomes: [
        "Mais pessoas encontram sua empresa",
        "Visitantes entendem o que você oferece em segundos",
        "Contatos chegam direto para o seu time",
      ],
      visual: "site",
      signal: "Novo contato pelo site",
    },
    {
      id: "lojas",
      name: "Lojas virtuais",
      title: "Sua loja aberta o dia inteiro, em qualquer lugar.",
      problem:
        "Suas vendas dependem do balcão, do horário comercial ou de mensagens trocadas uma a uma.",
      what: "Desenvolvemos lojas virtuais e catálogos digitais com pagamento integrado a plataformas como PagSeguro e Mercado Pago.",
      outcomes: [
        "Venda enquanto a loja física está fechada",
        "Pagamento, estoque e pedidos no mesmo lugar",
        "Catálogo sempre atualizado para enviar aos clientes",
      ],
      visual: "store",
      signal: "Pedido confirmado",
    },
    {
      id: "sistemas",
      name: "Sistemas sob medida",
      title: "Sua operação organizada em um só lugar.",
      problem:
        "Informações espalhadas em planilhas, cadernos e conversas. Retrabalho, erros e decisões no escuro.",
      what: "Construímos sistemas web feitos para o jeito que sua empresa trabalha, com automações que eliminam tarefas manuais.",
      outcomes: [
        "Menos retrabalho e menos erros",
        "Dados confiáveis para decidir com segurança",
        "Uma operação que cresce sem virar caos",
      ],
      visual: "system",
      signal: "Relatório gerado automaticamente",
    },
    {
      id: "aplicativos",
      name: "Aplicativos",
      title: "Sua ideia no bolso dos seus clientes.",
      problem:
        "Você tem a ideia de um aplicativo, mas não sabe por onde começar nem quanto custa tirá-la do papel.",
      what: "Planejamos e desenvolvemos aplicativos para celular com foco no que o usuário precisa fazer, sem funcionalidades desnecessárias.",
      outcomes: [
        "Uma primeira versão clara e viável",
        "Uma experiência que seus clientes entendem sem manual",
        "Uma base pronta para evoluir com o uso real",
      ],
      visual: "app",
      signal: "Agendamento confirmado no app",
    },
    {
      id: "identidade",
      name: "Identidade visual",
      title: "Uma marca que parece tão séria quanto o seu trabalho.",
      problem:
        "Sua empresa entrega qualidade, mas a marca não transmite isso. Cada material sai de um jeito diferente.",
      what: "Criamos identidades visuais consistentes: logotipo, cores, tipografia e aplicações para o digital e o impresso.",
      outcomes: [
        "Uma marca reconhecível em qualquer lugar",
        "Mais confiança na primeira impressão",
        "Materiais que seguem um padrão profissional",
      ],
      visual: "brand",
      signal: "Marca aplicada em todos os materiais",
    },
  ],
};

/** CONFIRMAR: diferenciais precisam refletir a prática real da Rocket. */
export const differentials = {
  eyebrow: "Por que a Rocket",
  title: "Um projeto importante merece um time que se importa com os detalhes.",
  items: [
    {
      title: "Você fala com quem constrói.",
      body: "Sem intermediários e sem telefone sem fio. As pessoas que entendem seu problema são as mesmas que desenvolvem a solução.",
    },
    {
      title: "Escopo claro antes de começar.",
      body: "Você sabe o que será entregue, em quais etapas e por quê. Nada de projetos que nunca terminam.",
    },
    {
      title: "Design e tecnologia no mesmo time.",
      body: "O que é bonito também precisa funcionar. Pensamos a experiência e o código juntos, desde o primeiro rascunho.",
    },
    {
      title: "Rápido, encontrável e seguro.",
      body: "Performance, SEO e boas práticas de segurança fazem parte da entrega, não são extras cobrados depois.",
    },
    {
      title: "Feito para crescer com você.",
      body: "Construímos com uma base sólida para que seu produto evolua junto com a sua empresa, sem precisar recomeçar do zero.",
    },
  ],
};

export const workflow = {
  eyebrow: "Como trabalhamos",
  title: "Um caminho claro, do primeiro café ao produto no ar.",
  lead: "Contratar tecnologia não precisa ser confuso. Você acompanha cada etapa e sabe exatamente o que está acontecendo.",
  steps: [
    {
      name: "Entendemos",
      title: "Conhecemos o seu negócio antes de falar de tecnologia.",
      body: "Conversamos sobre a sua operação, o problema que você quer resolver e o resultado que espera. É aqui que o projeto ganha direção.",
    },
    {
      name: "Planejamos",
      title: "Transformamos a necessidade em um plano executável.",
      body: "Definimos escopo, prioridades, etapas e prazos. Você aprova tudo antes de qualquer linha de código ser escrita.",
    },
    {
      name: "Construímos",
      title: "Design e desenvolvimento andando juntos.",
      body: "Você acompanha o progresso com entregas parciais, testa de verdade e ajusta o rumo sempre que precisar.",
    },
    {
      name: "Evoluímos",
      title: "Entregar é o começo, não o fim.",
      body: "Colocamos no ar, acompanhamos o uso real e seguimos melhorando o que faz diferença para o seu negócio.",
    },
  ],
};

export type CaseStudy = {
  client: string;
  segment: string;
  title: string;
  result: string;
  image?: { src: string; alt: string };
  href?: string;
};

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
};

/**
 * CONFIRMAR: prova social.
 *
 * Nunca preencha com dados inventados. Enquanto as listas estiverem vazias,
 * a seção não aparece em produção. Em desenvolvimento (npm run dev) ela mostra
 * exemplos claramente sinalizados para que o layout possa ser revisado.
 */
export const proof: {
  eyebrow: string;
  title: string;
  cases: CaseStudy[];
  testimonials: Testimonial[];
} = {
  eyebrow: "Projetos",
  title: "Trabalho que fala por si.",
  cases: [],
  testimonials: [],
};

export const proofPlaceholder: { cases: CaseStudy[]; testimonials: Testimonial[] } = {
  cases: [
    {
      client: "[Nome do cliente]",
      segment: "[Segmento]",
      title: "[O que foi construído]",
      result: "[Resultado real e verificável do projeto]",
    },
    {
      client: "[Nome do cliente]",
      segment: "[Segmento]",
      title: "[O que foi construído]",
      result: "[Resultado real e verificável do projeto]",
    },
  ],
  testimonials: [
    {
      quote: "[Depoimento real do cliente, com autorização para publicação.]",
      author: "[Nome]",
      role: "[Cargo, empresa]",
    },
  ],
};

export const cta = {
  eyebrow: "Próximo passo",
  title: ["Seu próximo projeto", "começa com uma conversa."],
  lead: "Conte o que sua empresa precisa. A gente entende o cenário, mostra o caminho mais claro e diz com sinceridade o que faz sentido construir agora.",
  submit: "Quero falar sobre meu projeto",
  interests: ["Site", "Loja virtual", "Sistema", "Aplicativo", "Identidade visual", "Ainda não sei"],
  // CONFIRMAR: se houver um prazo real de resposta, ele converte melhor aqui.
  reassurance: "Conversa sem compromisso.",
};

/** Abertura e convite final da página /projetos. */
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
