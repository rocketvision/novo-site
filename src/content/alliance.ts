import type { SectionContent } from "@/lib/content/schemas";
import { PROGRAM } from "@/lib/alliance/constants";

/**
 * Copy do Rocket Alliance.
 *
 * `allianceContent`: conteúdo inicial da seção editável no CMS (Configurações do programa > Página
 * pública). Os textos do programa são os aprovados; o FAQ é o ponto de partida sugerido.
 * `alliancePage`: textos fixos da página (nome, assinatura, slogans e chamadas oficiais).
 */

export const allianceContent: SectionContent<"alliance"> = {
  whatIs: {
    title: "O que é o Rocket Alliance",
    paragraphs: [
      "O Rocket Alliance é o programa oficial de parcerias da Rocket Vision, criado para conectar empresas, profissionais de tecnologia, agências e consultores que desejam crescer por meio de oportunidades comerciais, colaboração técnica e desenvolvimento de soluções digitais.",
      "A proposta é construir um ecossistema em que os parceiros possam indicar clientes, comercializar soluções, desenvolver projetos em conjunto e gerar receita recorrente.",
      "O programa tem identidade premium, benefícios progressivos, regras transparentes, reconhecimento e um portal exclusivo para parceiros.",
    ],
  },
  commissions: {
    rates: "hide",
    intro: "Um modelo comercial transparente: você sabe como cada comissão nasce, quando é aprovada e quando é paga.",
    rules: [
      "As comissões incidem sobre a receita líquida elegível efetivamente recebida pela Rocket Vision, de acordo com o termo de parceria.",
      "Serviços recorrentes poderão gerar participação nas primeiras 6 ou 12 mensalidades pagas, conforme configuração contratual.",
      "Projetos conjuntos terão remuneração negociada conforme escopo, custos e responsabilidades.",
      "Nenhuma comissão é paga duas vezes. Reembolsos, cancelamentos, inadimplência e ajustes são tratados com registros auditáveis.",
    ],
  },
  directory: {
    title: "Nossos parceiros",
    lead: "Empresas que constroem soluções, projetos e oportunidades ao lado da Rocket Vision.",
  },
  faq: [
    {
      question: "Quem pode participar do Rocket Alliance?",
      answer:
        "Empresas e profissionais que atuam com tecnologia, marketing, consultoria ou vendas e querem crescer junto com a Rocket Vision: agências, consultorias, empresas de TI, software houses, desenvolvedores e representantes comerciais. Cada candidatura é analisada individualmente.",
    },
    {
      question: "Como faço a inscrição?",
      answer:
        "Preencha o formulário desta página com os dados da empresa, a modalidade desejada e o seu interesse na parceria. A candidatura entra em análise e você recebe a confirmação por e-mail.",
    },
    {
      question: "Qual modalidade devo escolher?",
      answer:
        "A modalidade define como o parceiro atua. Referral Partner indica clientes; Business Partner inclui as soluções da Rocket no próprio portfólio; Technology Partner complementa a capacidade técnica; Strategic Partner constrói relações de longo prazo. Uma empresa pode ter mais de uma modalidade, se autorizada.",
    },
    {
      question: "Como funcionam as comissões?",
      answer:
        "As comissões incidem sobre a receita líquida elegível efetivamente recebida pela Rocket Vision, de acordo com o termo de parceria. Uma indicação gera comissão quando resulta em um contrato efetivamente pago. Os percentuais dependem do nível e das condições comerciais de cada parceiro.",
    },
    {
      question: "Como é feita a aprovação?",
      answer:
        "A equipe da Rocket Vision analisa o perfil da empresa, a modalidade escolhida e o alinhamento com o programa. Se precisarmos de mais informações, entramos em contato pelo e-mail informado. Aprovada a candidatura, seguimos para o onboarding: contrato, orientações e acesso ao portal.",
    },
    {
      question: "O que é o Alliance Hub?",
      answer:
        "É o portal exclusivo dos parceiros aprovados. Nele você registra e acompanha indicações, vê comissões e pagamentos, acessa materiais comerciais e treinamentos, encontra oportunidades, fala com a equipe Rocket Vision e gerencia a equipe da sua empresa.",
    },
    {
      question: "Como o meu nível evolui?",
      answer:
        "A evolução considera resultados comerciais, qualidade das indicações, satisfação dos clientes e cumprimento das regras do programa. Não depende exclusivamente do faturamento.",
    },
    {
      question: "E se outra empresa indicar o mesmo cliente?",
      answer:
        "Vale o primeiro registro válido no Alliance Hub. A indicação fica protegida pelo período definido nas regras do programa, e o parceiro acompanha cada etapa até o fechamento.",
    },
    {
      question: "Quais são as regras do programa?",
      answer:
        "As regras ficam no termo de parceria, aceito no onboarding: comissões, prazos, uso da marca, confidencialidade e conduta. Nenhuma comissão é paga duas vezes e todo ajuste fica registrado.",
    },
  ],
  apply: {
    title: "Seja um parceiro",
    lead: "Conte sobre a sua empresa e como você quer crescer com a Rocket Vision. A equipe analisa cada candidatura e responde pelo e-mail informado.",
  },
};

export const alliancePage = {
  hero: {
    eyebrow: PROGRAM.signature,
    title: PROGRAM.name,
    slogan: PROGRAM.slogan,
    message: PROGRAM.publicMessage,
    lead: "Faça parte de um ecossistema de empresas, criadores e especialistas que estão construindo o futuro das experiências digitais.",
    primary: "Quero ser parceiro",
    secondary: "Conheça nossos parceiros",
  },
  modalities: {
    eyebrow: "Modalidades",
    title: "Quatro formas de construir junto.",
    lead: "A modalidade define como o parceiro atua. O nível determina os benefícios disponíveis. Um parceiro pode ter mais de uma modalidade, caso autorizado.",
  },
  tiers: {
    eyebrow: "Níveis",
    title: "Reconhecimento que acompanha o seu crescimento.",
    lead: "A evolução considera resultados comerciais, qualidade das indicações, satisfação dos clientes e cumprimento das regras do programa. Não depende exclusivamente do faturamento.",
  },
  journey: { eyebrow: "Como funciona", title: "Da inscrição ao reconhecimento." },
  commissions: { eyebrow: "Comissões e benefícios", title: "Regras claras. Crescimento compartilhado.", rateLabel: "comissão inicial", ratesNote: "Percentuais das regras aprovadas, sobre a receita líquida elegível. Condições individuais podem variar conforme o termo de parceria." },
  directory: { eyebrow: "Diretório", search: "Buscar parceiros", allModalities: "Todas as modalidades", allSectors: "Todos os setores", empty: "Em breve, os primeiros parceiros do Rocket Alliance aparecem aqui.", noResults: "Nenhum parceiro encontrado com esses filtros.", clear: "Limpar filtros", more: "Ver mais parceiros" },
  faq: { eyebrow: "Dúvidas", title: "Perguntas frequentes" },
  final: { title: "Seja um parceiro.", slogan: PROGRAM.slogan, complement: PROGRAM.complement },
  hub: { label: "Já é parceiro?", link: "Entrar no Alliance Hub" },
} as const;
