import { common, createLowlight } from "lowlight";

/**
 * Realce de sintaxe dos blocos de código. Roda no servidor ao renderizar o artigo e no editor do Studio.
 * O resultado é uma árvore de spans com classes `hljs-*`, convertida em React: nada vira HTML cru.
 */
export const lowlight = createLowlight(common);

export const CODE_LANGUAGE_LABELS: Record<string, string> = {
  bash: "Terminal",
  css: "CSS",
  diff: "Diff",
  go: "Go",
  graphql: "GraphQL",
  java: "Java",
  javascript: "JavaScript",
  json: "JSON",
  kotlin: "Kotlin",
  markdown: "Markdown",
  php: "PHP",
  plaintext: "Texto",
  python: "Python",
  ruby: "Ruby",
  rust: "Rust",
  sql: "SQL",
  swift: "Swift",
  typescript: "TypeScript",
  xml: "HTML/XML",
  yaml: "YAML",
};
