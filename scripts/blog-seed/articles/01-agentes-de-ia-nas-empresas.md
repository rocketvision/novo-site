---
title: Agentes de IA nas empresas: o que são e como começar com segurança
slug: agentes-de-ia-nas-empresas
subtitle: Um agente não só responde perguntas: ele age em sistemas. Isso muda o tipo de cuidado que a empresa precisa ter.
excerpt: Agentes de IA planejam tarefas e usam ferramentas por conta própria. Entenda como funcionam, onde fazem sentido e quais controles colocar antes de dar autonomia a eles.
category: inteligencia-artificial
cover: agentes
coverAlt: Diagrama abstrato de um núcleo laranja conectado a cinco ferramentas por linhas tracejadas, com um ponto de aprovação destacado.
seoTitle: Agentes de IA nas empresas: como começar com segurança
seoDescription: O que são agentes de IA, onde fazem sentido e quais controles usar antes de dar autonomia a eles, com base no NIST AI RMF e no OWASP.
confirm:
  - Conferir se há versões mais novas do OWASP Top 10 para LLM e do NIST AI RMF na data da publicação.
---
Até pouco tempo atrás, usar inteligência artificial numa empresa significava, na maioria dos casos, conversar com um assistente: alguém fazia uma pergunta e recebia um texto de volta. O passo seguinte, que muitas equipes estão dando agora, é o **agente**: um sistema que recebe um objetivo, decide os passos para chegar lá e executa esses passos usando ferramentas de verdade, como consultar um banco de dados, abrir um chamado, enviar um e-mail ou atualizar uma planilha.

A diferença parece pequena, mas não é. Um assistente que erra entrega um texto ruim. Um agente que erra pode apagar um registro, mandar uma mensagem para o cliente errado ou aprovar algo que não deveria. Por isso, antes de falar em produtividade, vale entender como esses sistemas funcionam e quais cuidados colocar desde o início.

## O que é, na prática, um agente de IA

Não existe uma definição única, mas a maioria dos agentes usados em empresas tem quatro partes:

1. **Um modelo de linguagem**, que interpreta o pedido e decide o que fazer.
2. **Ferramentas**, que são as ações que o agente pode executar: chamar uma API, ler um documento, preencher um formulário, rodar uma consulta.
3. **Memória ou contexto**, com as informações de que ele precisa para a tarefa: histórico da conversa, documentos internos, dados do cliente.
4. **Um ciclo de execução**, em que o agente planeja, age, observa o resultado e decide o próximo passo, até concluir ou desistir.

É esse ciclo que dá a sensação de autonomia. Em vez de uma resposta única, o agente encadeia várias ações. E é também esse ciclo que exige atenção, porque cada volta é uma oportunidade de acerto ou de erro.

## Onde agentes costumam fazer sentido

Agentes funcionam melhor em tarefas com três características: são repetitivas, têm regras razoavelmente claras e o custo de um erro é baixo ou fácil de desfazer. Alguns exemplos comuns:

- **Triagem de atendimento**: ler a mensagem do cliente, classificar o assunto, buscar o histórico e sugerir a resposta para um atendente revisar.
- **Pesquisa interna**: responder perguntas da equipe consultando a documentação da empresa e indicando de onde veio cada informação.
- **Rotinas de back office**: conferir se um pedido tem todos os dados, cruzar informações entre sistemas e apontar divergências.
- **Apoio ao desenvolvimento**: abrir a análise inicial de um erro, reunir logs e propor uma correção que uma pessoa revisa.

O ponto comum é que, nesses casos, uma pessoa continua responsável pela decisão final, ou o agente atua em algo que pode ser revertido sem dano.

## Os riscos que mudam quando a IA passa a agir

O OWASP, fundação conhecida pelas listas de riscos em aplicações web, mantém uma lista específica para aplicações com modelos de linguagem. A edição de 2025 tem um item que resume bem o problema dos agentes: **agência excessiva** (LLM06), quando o sistema recebe mais permissões, mais ferramentas ou mais autonomia do que a tarefa exige.

Na prática, isso aparece de três formas:

- **Ferramentas demais**: o agente precisava só ler pedidos, mas recebeu acesso a uma API que também cancela pedidos.
- **Permissões demais**: a ferramenta certa, mas com uma credencial que acessa todos os clientes, e não só o cliente da conversa.
- **Autonomia demais**: ações sensíveis que acontecem sem nenhuma confirmação humana.

A mesma lista traz outro risco central para agentes: a **injeção de instruções** (LLM01, *prompt injection*). Como o agente lê conteúdos externos, como e-mails, páginas e documentos, alguém pode esconder nesses conteúdos instruções para desviar o comportamento dele. Um agente que lê a caixa de entrada e também pode enviar e-mails é um alvo natural. Tratamos esse tema em detalhe em outro artigo do Blog.

Há ainda riscos mais conhecidos, que ganham peso com a autonomia: vazamento de informação sensível (LLM02), saídas do modelo usadas sem validação por outros sistemas (LLM05) e consumo descontrolado de recursos (LLM10), quando um ciclo mal definido faz o agente repetir chamadas caras sem parar.

## Controles para começar com o pé direito

Nenhum desses riscos é motivo para não usar agentes. São motivos para desenhar bem. Estas são as práticas que costumam fazer mais diferença:

### 1. Menor privilégio, sempre

Cada ferramenta deve fazer só o necessário, com uma credencial que enxerga só o necessário. Se o agente atende um cliente, a consulta deve ser limitada aos dados daquele cliente no próprio servidor, e não confiar no modelo para "lembrar" de filtrar. É o mesmo princípio que vale para qualquer sistema, só que aqui ele é ainda mais importante.

### 2. Aprovação humana nas ações que importam

Separe as ações em dois grupos: as que só leem ou preparam algo, e as que mudam o mundo real (pagar, cancelar, enviar, apagar). As do segundo grupo passam por confirmação de uma pessoa, pelo menos até existir histórico suficiente para confiar no comportamento do agente naquela tarefa.

### 3. Tudo que entra é dado, não ordem

Conteúdo que vem de fora (a mensagem do cliente, um anexo, uma página da internet) deve ser tratado como dado a ser analisado, nunca como instrução a ser seguida. Nenhuma técnica elimina por completo a injeção de instruções, então o desenho precisa garantir que, mesmo enganado, o agente não consiga causar grande estrago.

### 4. Limites de execução

Defina número máximo de passos, tempo máximo e custo máximo por tarefa. Um agente que não consegue concluir deve parar e pedir ajuda, e não insistir indefinidamente.

### 5. Registro de cada passo

Guarde o que o agente recebeu, o que decidiu, quais ferramentas chamou e o que obteve. Sem esse registro, não há como investigar um erro, melhorar o comportamento ou responder a um cliente que questiona uma decisão.

### 6. Avaliação antes e depois

Antes de colocar um agente em uso, monte um conjunto de casos de teste com situações reais, inclusive as difíceis e as maliciosas. Depois, acompanhe os resultados em produção. Mudanças no modelo, nas instruções ou nas ferramentas podem alterar o comportamento de formas inesperadas.

## Uma referência para organizar a governança

Para quem quer uma estrutura mais ampla, o NIST, instituto de padrões dos Estados Unidos, publicou em janeiro de 2023 o **AI Risk Management Framework (AI RMF 1.0)**, organizado em quatro funções: **governar**, **mapear**, **medir** e **gerenciar**. Em julho de 2024, o instituto publicou um perfil específico para IA generativa (NIST AI 600-1), com riscos e ações sugeridas para esse tipo de sistema.

O documento não é uma norma obrigatória no Brasil, mas é útil como roteiro: quem é responsável pelo sistema, em que contexto ele será usado, como o desempenho e os riscos serão medidos e o que acontece quando algo sai do esperado. Essas perguntas valem para qualquer empresa, de qualquer tamanho.

## Por onde começar

Se a sua empresa está avaliando agentes, um caminho seguro é:

1. Escolher **uma** tarefa bem delimitada, com volume suficiente para valer a pena e baixo impacto em caso de erro.
2. Começar com o agente **sugerindo**, e uma pessoa **decidindo**.
3. Medir o resultado com critérios definidos antes: tempo economizado, taxa de acerto, casos que precisaram de correção.
4. Só então ampliar a autonomia, uma ação de cada vez.

Agentes podem tirar trabalho repetitivo das mãos da equipe e deixar as pessoas com o que exige julgamento. O ganho vem quando a autonomia cresce junto com a confiança, e não antes dela.

## Referências

- OWASP GenAI Security Project. [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/). Acesso em 29 set. 2026.
- NIST. [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework). Acesso em 29 set. 2026.
- NIST. [NIST AI 600-1: Artificial Intelligence Risk Management Framework, Generative Artificial Intelligence Profile](https://doi.org/10.6028/NIST.AI.600-1). Acesso em 29 set. 2026.
