import type { SectionKey } from "@/lib/content/schemas";

/**
 * Descrição dos campos de cada seção no editor do CMS.
 *
 * Cada campo corresponde a algo que o componente da landing realmente exibe.
 * Os limites repetem os do schema (src/lib/content/schemas.ts) para o contador do campo;
 * a validação que vale é sempre a do servidor.
 */

export type FieldSpec =
  | { type: "text"; key: string; label: string; max: number; multiline?: boolean; optional?: boolean; hint?: string; disabledWhen?: (parent: Record<string, unknown>) => string | null }
  | { type: "lines"; key: string; label: string; itemLabel: string; max: number; min: number; maxItems: number; hint?: string; fixedLabels?: string[] }
  | { type: "link"; key: string; label: string; hint?: string }
  | { type: "image"; key: string; label: string; hint?: string; minWidth?: number }
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[]; hint?: string }
  | { type: "group"; key: string; label: string; fields: FieldSpec[]; hint?: string }
  | {
      type: "list";
      key: string;
      label: string;
      itemLabel: string;
      /** Título do cartão de cada item, a partir do conteúdo. */
      itemTitle?: (item: Record<string, unknown>) => string;
      min: number;
      maxItems: number;
      /** Quantidade fixa: sem adicionar nem remover, só editar e reordenar. */
      fixed?: boolean;
      fields: FieldSpec[];
      newItem?: () => Record<string, unknown>;
      hint?: string;
    };

export const SECTION_FIELDS: Record<SectionKey, FieldSpec[]> = {
  hero: [
    { type: "text", key: "eyebrow", label: "Rótulo", max: 80, hint: "Texto pequeno acima do título." },
    {
      type: "lines",
      key: "titleLines",
      label: "Título",
      itemLabel: "Linha",
      max: 40,
      min: 1,
      maxItems: 4,
      hint: "Cada linha entra em sequência na animação de abertura. Use de 1 a 4 linhas curtas.",
    },
    { type: "text", key: "lead", label: "Descrição", max: 260, multiline: true },
    { type: "link", key: "primaryCta", label: "Botão principal", hint: "Use #contato para levar ao formulário no fim da página." },
    { type: "link", key: "secondaryCta", label: "Link secundário", hint: "Aparece ao lado do botão, com uma seta para baixo." },
    { type: "image", key: "image", label: "Foto de abertura", minWidth: 1920, hint: "Ocupa a tela inteira durante o scroll. Prefira fotos horizontais com pelo menos 1920 px de largura." },
  ],
  problem: [
    { type: "text", key: "eyebrow", label: "Rótulo", max: 60, hint: "Aparece no centro da tela quando os objetos começam a cair." },
    {
      type: "list",
      key: "symptoms",
      label: "Improvisos",
      itemLabel: "Improviso",
      itemTitle: (item) => String(item.text ?? ""),
      min: 4,
      maxItems: 4,
      fixed: true,
      hint: "Os quatro objetos que caem sobre a foto, um em cada canto.",
      fields: [
        {
          type: "select",
          key: "kind",
          label: "Tipo de objeto",
          options: [
            { value: "file", label: "Arquivo de planilha" },
            { value: "chat", label: "Mensagem de conversa" },
            { value: "search", label: "Busca sem resultado" },
            { value: "note", label: "Post-it" },
          ],
        },
        { type: "text", key: "artifact", label: "Texto do objeto", max: 60, hint: "Nome do arquivo, mensagem, termo buscado ou anotação." },
        {
          type: "text",
          key: "meta",
          label: "Complemento",
          max: 40,
          optional: true,
          disabledWhen: (item) => (item.kind === "note" ? "O post-it não exibe complemento." : null),
        },
        { type: "text", key: "text", label: "Legenda", max: 70, hint: "Frase exibida abaixo do objeto." },
      ],
    },
    {
      type: "lines",
      key: "conclusion",
      label: "Conclusão",
      itemLabel: "Frase",
      max: 60,
      min: 2,
      maxItems: 2,
      fixedLabels: ["Primeira frase (branca)", "Segunda frase (em destaque)"],
    },
  ],
  shift: [
    { type: "text", key: "eyebrow", label: "Rótulo", max: 40 },
    { type: "text", key: "title", label: "Título", max: 140, multiline: true },
    {
      type: "list",
      key: "groups",
      label: "Grupos",
      itemLabel: "Grupo",
      itemTitle: (item) => {
        const pairs = item.pairs as { before?: string }[] | undefined;
        return pairs?.[0]?.before ?? "";
      },
      min: 1,
      maxItems: 4,
      hint: "Cada grupo tem dois pares de antes e depois e troca de painel por cortina. Os seis primeiros pares têm um visual próprio, na ordem: planilha, conversa, busca, balcão, ideia no papel e tarefa repetida.",
      newItem: () => ({ pairs: [{ before: "", after: "" }, { before: "", after: "" }] }),
      fields: [
        {
          type: "list",
          key: "pairs",
          label: "Antes e depois",
          itemLabel: "Par",
          itemTitle: (item) => String(item.before ?? ""),
          min: 2,
          maxItems: 2,
          fixed: true,
          fields: [
            { type: "text", key: "before", label: "Antes", max: 70, hint: "Aparece riscado." },
            { type: "text", key: "after", label: "Depois", max: 110, multiline: true },
          ],
        },
      ],
    },
  ],
  statement: [
    {
      type: "text",
      key: "title",
      label: "Título",
      max: 160,
      multiline: true,
      hint: "A primeira frase fica em destaque; o restante aparece em tom mais claro. Separe as frases com ponto.",
    },
    { type: "text", key: "body", label: "Texto", max: 320, multiline: true },
  ],
  services: [
    { type: "text", key: "eyebrow", label: "Rótulo", max: 40 },
    { type: "text", key: "title", label: "Título", max: 80 },
    { type: "text", key: "lead", label: "Descrição", max: 200, multiline: true },
    {
      type: "list",
      key: "items",
      label: "Serviços",
      itemLabel: "Serviço",
      itemTitle: (item) => String(item.name ?? ""),
      min: 1,
      maxItems: 8,
      newItem: () => ({
        id: `servico-${Math.random().toString(36).slice(2, 8)}`,
        name: "",
        title: "",
        problem: "",
        what: "",
        outcomes: [""],
        signal: "",
      }),
      fields: [
        { type: "text", key: "name", label: "Nome", max: 40, hint: "Aparece na navegação entre serviços." },
        { type: "text", key: "title", label: "Título", max: 80 },
        { type: "text", key: "problem", label: "Problema", max: 220, multiline: true },
        { type: "text", key: "what", label: "O que fazemos", max: 240, multiline: true },
        { type: "lines", key: "outcomes", label: "Resultados", itemLabel: "Resultado", max: 80, min: 1, maxItems: 4 },
        { type: "text", key: "signal", label: "Sinal de resultado", max: 50, hint: "Notificação exibida sobre o visual do serviço." },
      ],
    },
  ],
  differentials: [
    { type: "text", key: "eyebrow", label: "Rótulo", max: 40 },
    { type: "text", key: "title", label: "Título", max: 120, multiline: true },
    {
      type: "list",
      key: "items",
      label: "Diferenciais",
      itemLabel: "Diferencial",
      itemTitle: (item) => String(item.title ?? ""),
      min: 1,
      maxItems: 8,
      newItem: () => ({ title: "", body: "" }),
      fields: [
        { type: "text", key: "title", label: "Título", max: 60 },
        { type: "text", key: "body", label: "Texto", max: 220, multiline: true },
      ],
    },
  ],
  workflow: [
    { type: "text", key: "eyebrow", label: "Rótulo", max: 40 },
    { type: "text", key: "title", label: "Título", max: 100 },
    { type: "text", key: "lead", label: "Descrição", max: 220, multiline: true },
    {
      type: "list",
      key: "steps",
      label: "Etapas",
      itemLabel: "Etapa",
      itemTitle: (item) => String(item.name ?? ""),
      min: 2,
      maxItems: 6,
      newItem: () => ({ name: "", title: "", body: "" }),
      fields: [
        { type: "text", key: "name", label: "Nome", max: 24 },
        { type: "text", key: "title", label: "Título", max: 80 },
        { type: "text", key: "body", label: "Texto", max: 220, multiline: true },
      ],
    },
  ],
  turn: [
    { type: "text", key: "from", label: "Primeira frase", max: 90, hint: "É riscada e se desmonta palavra por palavra." },
    { type: "text", key: "strike", label: "Palavra riscada", max: 30, hint: "Precisa ser uma palavra da primeira frase." },
    { type: "text", key: "to", label: "Segunda frase", max: 60, hint: "A última palavra ganha destaque e o foguete." },
  ],
  cta: [
    { type: "text", key: "eyebrow", label: "Rótulo", max: 40 },
    { type: "lines", key: "titleLines", label: "Título", itemLabel: "Linha", max: 40, min: 1, maxItems: 3 },
    { type: "text", key: "lead", label: "Descrição", max: 260, multiline: true },
    { type: "lines", key: "interests", label: "Opções de interesse", itemLabel: "Opção", max: 30, min: 1, maxItems: 10, hint: "Botões que a pessoa marca no formulário." },
    { type: "text", key: "submit", label: "Texto do botão de envio", max: 40 },
    { type: "text", key: "reassurance", label: "Texto de apoio", max: 80, optional: true, hint: "Aparece ao lado do botão. Deixe vazio para não exibir." },
    { type: "image", key: "image", label: "Foto", minWidth: 1920, hint: "Decorativa: abre até as bordas da tela por trás do título." },
  ],
  projectsPage: [
    { type: "text", key: "eyebrow", label: "Rótulo", max: 30 },
    { type: "text", key: "title", label: "Título", max: 80 },
    { type: "text", key: "lead", label: "Descrição", max: 240, multiline: true, hint: "Também é usada como descrição da página nos buscadores." },
    {
      type: "group",
      key: "cta",
      label: "Convite no fim da página",
      fields: [
        { type: "text", key: "title", label: "Título", max: 80 },
        { type: "text", key: "body", label: "Texto", max: 200, multiline: true },
        { type: "text", key: "label", label: "Texto do botão", max: 40 },
      ],
    },
  ],
  site: [
    {
      type: "group",
      key: "seo",
      label: "Buscadores e compartilhamento",
      fields: [
        { type: "text", key: "title", label: "Título da página inicial", max: 70, hint: "Aparece na aba do navegador e no Google." },
        { type: "text", key: "description", label: "Descrição", max: 170, multiline: true },
      ],
    },
    { type: "text", key: "footerTagline", label: "Frase do rodapé", max: 140, multiline: true },
    {
      type: "group",
      key: "contact",
      label: "Contato",
      hint: "Campos vazios não aparecem no site.",
      fields: [
        { type: "text", key: "email", label: "E-mail", max: 120, optional: true },
        { type: "text", key: "phone", label: "Telefone", max: 30, optional: true },
        { type: "text", key: "whatsapp", label: "WhatsApp", max: 15, optional: true, hint: "Só números, com DDI e DDD. Ex.: 5514999999999" },
      ],
    },
    {
      type: "list",
      key: "social",
      label: "Redes sociais",
      itemLabel: "Rede",
      itemTitle: (item) => String(item.label ?? ""),
      min: 0,
      maxItems: 8,
      newItem: () => ({ label: "", href: "" }),
      hint: "Só perfis reais da Rocket Vision. Lista vazia não aparece no site.",
      fields: [
        { type: "text", key: "label", label: "Nome", max: 30 },
        { type: "text", key: "href", label: "Link", max: 500, hint: "Endereço completo, começando com https://." },
      ],
    },
    {
      type: "group",
      key: "legal",
      label: "Dados da empresa",
      fields: [
        { type: "text", key: "companyName", label: "Razão social", max: 120, optional: true, hint: "Vazio: o rodapé mostra Rocket Vision." },
        { type: "text", key: "cnpj", label: "CNPJ", max: 18, optional: true },
      ],
    },
  ],
};
