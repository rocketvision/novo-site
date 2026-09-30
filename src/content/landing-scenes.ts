/**
 * Textos das seções entre a abertura e o formulário, na estrutura de cenas presas ao scroll:
 * projetos rodando dentro de notebook e celular, uma cena por serviço, as duas letras da marca
 * e os planos. O texto de cada serviço (título, descrição, resultados) continua vindo do CMS.
 *
 * Tudo marcado com "CONFIRMAR" precisa ser validado antes de ir para produção.
 */

export const projectsTrack = {
  label: "Projetos",
  title: ["Quem já decolou", "com a Rocket."],
  lead: "Site bom a gente mostra no ar. Role e veja cada projeto por dentro, no notebook e no celular.",
  legend: "cliente",
  live: "Ver o site no ar",
  details: "Ver o case",
  next: { title: ["O próximo", "pode ser", "o seu."], cta: "Começar meu projeto", href: "#contato" },
};

export const servicesIntro = {
  label: "Serviços",
  title: ["O que a Rocket faz", "pra tirar o seu", "negócio do chão."],
  lead: "Quatro frentes, cada uma resolve um problema diferente. Role pra ver cada uma funcionando.",
  more: "Quero isso",
};

/** Cenas por serviço, pelo identificador do CMS. Os números são ilustrativos. */
export const scenes = {
  sites: { word: "SITES" },
  sistemas: {
    // O caos antes do sistema: cada nota é um improviso que o sistema substitui.
    notes: ["planilha_final_v3.xlsx", "cadê o pedido 1042?", "quem já pagou?", "estoque: conferir", "caderno do caixa", "print do WhatsApp", "manda de novo?", "relatório de sexta"],
    dashboard: {
      revenue: { label: "Faturamento do mês", value: "R$ 48.270", delta: "+18% sobre o mês passado" },
      orders: { label: "Pedidos", value: "312" },
      ticket: { label: "Ticket médio", value: "R$ 154" },
      chart: "Vendas por semana",
      stock: { label: "Estoque baixo", value: "7 itens" },
      recent: [
        { who: "Ana L.", value: "R$ 189", status: "pago" },
        { who: "Bruno S.", value: "R$ 96", status: "separando" },
        { who: "Carla M.", value: "R$ 412", status: "enviado" },
      ],
    },
    sample: "dados de exemplo",
  },
  lojas: {
    headline: "Sua loja vende até de madrugada.",
    sub: "Enquanto você dorme, o pedido entra, o pagamento confirma e o estoque se atualiza sozinho.",
    orders: [
      { time: "02:14", text: "Pedido #1042 confirmado", value: "R$ 289,90" },
      { time: "03:37", text: "Pix recebido", value: "R$ 159,00" },
      { time: "05:02", text: "Pedido #1043 confirmado", value: "R$ 74,50" },
      { time: "06:48", text: "Etiqueta de envio gerada", value: "Correios" },
    ],
    store: "Sua loja",
    sample: "pedidos de exemplo",
  },
  aplicativos: {
    app: "Seu app",
    push: { title: "Seu app", body: "Agendamento confirmado para amanhã, 10h.", when: "agora" },
    screen: { greeting: "Olá, Marina", next: "Próximo horário", slot: "Amanhã · 10:00", action: "Remarcar", items: ["Histórico", "Pagamentos", "Indique e ganhe"] },
    sample: "tela de exemplo",
  },
} as const;

export const promises = {
  label: "Rocket",
  intro: { title: ["Duas letras.", "Duas promessas."], body: "A Rocket Vision cabe em duas letras, e cada uma é um compromisso com o seu negócio. Role pra abrir a marca." },
  letters: [
    {
      letter: "R",
      word: "Resultado",
      body: "Cada tela existe por um motivo: trazer um contato, fechar uma venda ou devolver horas do seu dia. Se não cumpre esse papel, não entra no projeto.",
      link: { label: "Ver os projetos", href: "#projetos" },
    },
    {
      letter: "V",
      word: "Visão",
      body: "A gente entende o seu negócio antes de falar de tecnologia, e constrói pensando em onde ele vai estar daqui a alguns anos, não só na entrega.",
      link: { label: "Ver os serviços", href: "#servicos" },
    },
  ],
  outro: { title: ["Juntas, viram", "a Rocket Vision."], body: "Sites, lojas, sistemas e aplicativos para empresas que querem ir além do que imaginaram." },
};

// CONFIRMAR: nomes, itens e condições dos planos. A estrutura está pronta; o conteúdo é uma proposta.
export const plans = {
  label: "Planos",
  title: ["Três rotas.", "Você decola de onde está."],
  lead: "Cada plano inclui o anterior, e dá pra subir de rota quando o negócio pedir, sem refazer nada.",
  note: "O valor sai na primeira conversa, de graça e sem compromisso.",
  cta: { label: "Quero conversar", href: "#contato" },
  items: [
    {
      tag: "plano essencial",
      name: "Decolar",
      pitch: "Sua empresa existe na internet e é encontrada por quem procura.",
      features: ["Site ou landing page sob medida", "Textos e estrutura pensados pra converter", "Botões e formulário direto pro WhatsApp", "SEO técnico e Google Meu Negócio", "Rápido e perfeito no celular", "Domínio, hospedagem e SSL configurados"],
      cta: "Quero decolar",
    },
    {
      tag: "plano crescimento",
      name: "Acelerar",
      pitch: "Além de existir, o digital vende e traz cliente novo todo mês.",
      features: ["Tudo do Decolar", "Loja virtual ou páginas de campanha", "Pagamento, frete e estoque integrados", "Painel pra editar o site sem depender de ninguém", "Identidade visual aplicada", "Relatório mensal de visitas e vendas"],
      cta: "Quero acelerar",
    },
    {
      tag: "plano operação",
      name: "Orbitar",
      pitch: "O digital deixa de ser vitrine e passa a rodar o negócio por dentro.",
      features: ["Tudo do Acelerar", "Sistema sob medida: clientes, pedidos, estoque e caixa", "Aplicativo para os seus clientes", "Integrações com o que você já usa", "Treinamento da equipe", "Suporte e evolução contínua"],
      cta: "Quero orbitar",
    },
  ],
};

/**
 * Trilho lateral: os capítulos da página. Cada um é uma letra da marca que se preenche com o scroll,
 * de `from` (topo da primeira seção) a `to` (fim da última).
 */
export const rail = [
  { id: "projetos", from: "projetos", to: "projetos", label: "Projetos", glyph: "R", meaning: "R de Resultado" },
  { id: "servicos", from: "servicos", to: "rocket", label: "Serviços", glyph: "V", meaning: "V de Visão" },
  { id: "planos", from: "planos", to: "planos", label: "Planos", glyph: "mark", meaning: "o foguete da Rocket" },
];
