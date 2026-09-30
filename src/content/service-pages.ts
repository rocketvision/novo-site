/**
 * Páginas de cada serviço (/servicos/[slug]), abertas pelo "Saiba mais" das cenas da home.
 * A abertura de cada página é a mesma cena da home, com o nome do serviço como título; o resumo e os
 * três resultados vêm do CMS (seção Serviços). Aqui fica o que só existe na página: o que é, o que
 * muda no negócio e quais projetos reais usaram o serviço.
 */

export type ServicePage = {
  slug: string;
  /** Identificador do serviço no CMS (e da cena animada). */
  service: "sites" | "lojas" | "sistemas" | "aplicativos" | "anuncios";
  title: string;
  whatIs: string[];
  changes: { title: string; body: string }[];
  /** Projetos reais (slug no CMS) feitos com o serviço. Sem nenhum, a seção não aparece. */
  projects: string[];
};

export const servicePages: ServicePage[] = [
  {
    slug: "criacao-de-sites",
    service: "sites",
    title: "Criação de sites",
    whatIs: [
      "Nada de modelo pronto com a sua cor e o seu logo. Antes da primeira tela, a Rocket entende o que você vende, pra quem vende e o que a pessoa precisa fazer quando chega no site: chamar no WhatsApp, pedir um orçamento ou agendar.",
      "Design, texto e código saem do mesmo time, então o site nasce rápido, fácil de encontrar no Google e pronto para você editar sem depender de ninguém.",
    ],
    changes: [
      { title: "Sua empresa com endereço próprio", body: "Um site seu, que não depende de algoritmo nem some se uma rede social sair do ar." },
      { title: "O visitante sabe o próximo passo", body: "Cada página termina num convite claro: falar com você, pedir orçamento ou comprar." },
      { title: "Perfeito no celular", body: "A maior parte das visitas chega pelo telefone. O site é pensado pra ele primeiro." },
      { title: "Pronto pra crescer", body: "Dá pra somar páginas, blog, agendamento ou loja depois, sem começar do zero." },
    ],
    projects: ["mmv-assessoria", "gautica", "gautica-central-de-ajuda", "gautica-cadastro"],
  },
  {
    slug: "lojas-virtuais",
    service: "lojas",
    title: "Lojas virtuais",
    whatIs: [
      "Uma loja com a cara da sua marca, não um template genérico. A Rocket organiza o catálogo, o carrinho e o pagamento pra que comprar seja simples, do primeiro clique ao Pix confirmado.",
      "Pagamento, frete e estoque conversam entre si: o pedido entra, o estoque atualiza e você só cuida de separar e enviar.",
    ],
    changes: [
      { title: "Vendas fora do horário comercial", body: "A loja atende de madrugada, no fim de semana e no feriado, sem ninguém de plantão." },
      { title: "Tudo num lugar só", body: "Pedidos, pagamentos e estoque no mesmo painel, sem planilha paralela." },
      { title: "Compra sem atrito", body: "Poucos passos até o pagamento, com Pix e cartão pelos meios que você já usa." },
      { title: "Catálogo sempre em dia", body: "Um link pra mandar pros clientes com os produtos, preços e fotos atualizados." },
    ],
    projects: [],
  },
  {
    slug: "sistemas-sob-medida",
    service: "sistemas",
    title: "Sistemas sob medida",
    whatIs: [
      "Muita empresa roda em cima de planilhas, cadernos e mensagens perdidas no WhatsApp. A Rocket olha como o seu time trabalha hoje e transforma isso num sistema feito pro seu processo, não o contrário.",
      "Começamos pelo que mais dói e entregamos em etapas: você usa cedo, dá retorno e o sistema cresce junto com a operação.",
    ],
    changes: [
      { title: "Fim da planilha bagunçada", body: "Clientes, pedidos, estoque e caixa num só lugar, com cada um vendo o que precisa." },
      { title: "Menos trabalho repetido", body: "O que é manual e se repete vira automação: relatórios, avisos e cobranças." },
      { title: "Decisão com dado confiável", body: "Números atualizados na hora, em vez de esperar o fechamento do mês." },
      { title: "Cresce sem virar caos", body: "Mais gente, mais pedidos e mais filiais sem trocar de ferramenta." },
    ],
    projects: ["gautica-central-de-ajuda"],
  },
  {
    slug: "aplicativos",
    service: "aplicativos",
    title: "Aplicativos",
    whatIs: [
      "Um app bom faz poucas coisas muito bem. A Rocket começa pelo que o seu cliente precisa resolver no celular e desenha uma primeira versão enxuta, clara e viável.",
      "Com o app nas mãos das pessoas, os próximos passos saem do uso real, não de achismo.",
    ],
    changes: [
      { title: "Sua marca na tela inicial", body: "O cliente te encontra com um toque, sem procurar seu contato." },
      { title: "Notificação que traz de volta", body: "Lembretes, confirmações e novidades chegam direto no celular." },
      { title: "Sem manual", body: "Uma experiência que qualquer pessoa entende na primeira vez." },
      { title: "Base pra evoluir", body: "Uma primeira versão pronta pra crescer conforme o uso mostra o caminho." },
    ],
    projects: [],
  },
  {
    slug: "anuncios",
    service: "anuncios",
    title: "Anúncios no Google e nas redes",
    whatIs: [
      "São dois jeitos diferentes de aparecer. No Google, você entra na tela de quem acabou de digitar exatamente o que você vende. No Instagram e no Facebook, você aparece pra quem tem cara de cliente e ainda não te conhece.",
      "A gente escolhe o canal pelo seu caso, monta a conta, bloqueia o que só gasta e acompanha as primeiras semanas cortando o que não traz cliente. A verba fica no seu cartão, na sua conta de anúncio.",
    ],
    changes: [
      { title: "Aparece na hora certa", body: "No Google, sua empresa entra na tela quando a pessoa está buscando pra contratar." },
      { title: "Alcança quem ainda não procura", body: "Nas redes, você aparece pra quem tem o perfil de cliente e nunca ouviu falar de você." },
      { title: "Você controla o gasto", body: "Define quanto entra por dia. A verba sai do seu cartão direto pro Google e pro Meta, sem intermediário." },
      { title: "Dá pra ver o resultado", body: "Você sabe quanto custou cada contato e de onde ele veio. Sem achismo." },
    ],
    projects: [],
  },
];

export const servicePageCopy = {
  back: "Todos os serviços",
  whatIs: "O que é",
  changes: "O que muda no seu negócio.",
  projects: "Feito com esse serviço",
  client: "cliente",
  cta: {
    title: "Vamos colocar isso no ar?",
    body: "A primeira conversa é sem compromisso: você conta o que precisa e a Rocket mostra o caminho.",
    primary: "Fazer meu diagnóstico",
    secondary: "Chamar no WhatsApp",
    plans: "Ver os planos",
  },
  others: "Outros serviços",
};

export const servicePageBySlug = (slug: string) => servicePages.find((p) => p.slug === slug);
export const servicePageFor = (service: string) => servicePages.find((p) => p.service === service);
