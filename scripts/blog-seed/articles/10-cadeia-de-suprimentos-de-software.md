---
title: Cadeia de suprimentos de software: o risco que chega pelas dependências
slug: cadeia-de-suprimentos-de-software
subtitle: A maior parte do código de um sistema moderno não foi escrita pela equipe que o mantém. Isso exige um cuidado próprio.
excerpt: Falhas na cadeia de suprimentos de software entraram no OWASP Top 10 2025. Entenda o que são, o papel do SBOM e do SLSA e as práticas que reduzem o risco no dia a dia de um projeto.
category: desenvolvimento
cover: supply-chain
coverAlt: Árvore de dependências com um nó raiz escuro, ramos de nós brancos e um nó laranja destacado no nível mais baixo.
seoTitle: Cadeia de suprimentos de software: riscos e práticas
seoDescription: O que são ataques e falhas na cadeia de suprimentos de software, o papel do SBOM e do SLSA e práticas para proteger as dependências do seu sistema.
confirm:
  - Conferir a versão atual do SLSA e dos documentos de elementos mínimos de SBOM da CISA.
---
Um sistema web típico de hoje depende de dezenas de bibliotecas diretas e, por meio delas, de centenas de outras. Frameworks, componentes de interface, bibliotecas de data, de criptografia, de conexão com banco de dados, ferramentas de build e de teste. É um dos grandes motivos pelos quais o software evoluiu tão rápido: ninguém precisa reinventar tudo.

O outro lado é que cada uma dessas peças é código de terceiros rodando dentro do seu sistema, com os mesmos privilégios. Se uma delas tiver uma falha, ou for comprometida de propósito, o problema passa a ser seu.

Não por acaso, a edição 2025 do OWASP Top 10, a lista mais conhecida de riscos em aplicações web, incluiu uma categoria nova em terceiro lugar: **falhas na cadeia de suprimentos de software** (A03:2025).

## Como o risco se manifesta

Há dois grandes tipos de problema.

### Vulnerabilidades em dependências legítimas

Uma biblioteca popular tem uma falha de segurança descoberta. Todos os sistemas que usam a versão afetada ficam expostos até atualizarem. É o caso mais comum, e a defesa depende de saber o que você usa e de atualizar rápido.

### Comprometimento intencional

Aqui o risco é criado de propósito. Alguns exemplos de técnicas conhecidas:

- **Pacote malicioso com nome parecido** com o de uma biblioteca popular, esperando um erro de digitação na instalação.
- **Conta de mantenedor invadida**, que publica uma versão nova com código malicioso de uma biblioteca legítima.
- **Confusão de dependências**, quando um pacote público é publicado com o mesmo nome de um pacote interno da empresa, e o sistema de build baixa o público por engano.
- **Comprometimento do processo de build**, em que o código-fonte está correto, mas o artefato gerado e publicado foi alterado.

## Três ideias que ajudam a organizar a defesa

### 1. Saber o que você usa: SBOM

O **SBOM** (*Software Bill of Materials*) é, na definição da CISA, um inventário aninhado, uma lista de ingredientes dos componentes que formam um software. Com ele, quando uma vulnerabilidade é anunciada numa biblioteca, a pergunta "estamos expostos?" passa a ter resposta em minutos, e não em dias.

Formatos como SPDX e CycloneDX são amplamente suportados por ferramentas que geram o SBOM automaticamente a partir do projeto. A CISA mantém orientações sobre os elementos mínimos que um SBOM deve conter.

### 2. Saber de onde veio o que você publica: SLSA

O **SLSA** (*Supply-chain Levels for Software Artifacts*, pronuncia-se "salsa") é um conjunto de diretrizes de segurança para a cadeia de suprimentos, construído por consenso da indústria e mantido como colaboração no âmbito da Linux Foundation. Ele organiza práticas em níveis crescentes, com foco em garantir que um artefato foi construído a partir do código esperado, por um processo confiável, e que isso pode ser verificado por meio de registros de procedência (*provenance*).

### 3. Confiar menos, verificar mais

É o mesmo princípio do Zero Trust aplicado ao código: nenhuma dependência é confiável só por ser popular. Verificar integridade, limitar privilégios e revisar mudanças vale também para o que vem de fora.

## Práticas para o dia a dia de um projeto

Não é preciso um programa corporativo complexo para reduzir bastante o risco. Estas práticas cabem em projetos de qualquer tamanho:

1. **Arquivo de travamento de versões.** Use e versione o *lockfile* do gerenciador de pacotes (como `package-lock.json`), para que todos os ambientes instalem exatamente as mesmas versões.
2. **Instalação reprodutível no CI.** Em pipelines, use comandos que respeitam o lockfile e falham se ele estiver inconsistente, como `npm ci`.
3. **Monitoramento de vulnerabilidades.** Ative alertas automáticos de dependências vulneráveis no repositório e trate os alertas como parte do trabalho, e não como ruído.
4. **Atualização contínua e em pequenas doses.** Atualizar um pouco toda semana é muito mais seguro do que fazer uma atualização enorme uma vez por ano.
5. **Critério para adicionar dependências.** Antes de instalar uma biblioteca nova, pergunte: ela é mantida? Quantas outras dependências ela traz? O problema não se resolve com poucas linhas de código próprio?
6. **Cuidado com scripts de instalação.** Alguns pacotes executam código no momento da instalação. Ferramentas e configurações que restringem esse comportamento reduzem a superfície de ataque.
7. **Escopos e registros privados** para pacotes internos, evitando a confusão de dependências.
8. **Segredos fora do código e do build.** Credenciais de publicação e de produção guardadas em cofres de segredos, com o menor acesso possível.
9. **Proteção do pipeline.** Revisão obrigatória para mudanças no processo de build e de publicação, e ações de terceiros fixadas em versões específicas.

## Perguntas para o seu fornecedor de software

Se o seu sistema é desenvolvido por terceiros, estas perguntas ajudam a entender como a cadeia de suprimentos está sendo cuidada:

1. Existe uma lista atualizada das bibliotecas usadas e das versões? É possível gerar um SBOM?
2. Como vocês ficam sabendo de uma vulnerabilidade numa dependência? Em quanto tempo ela é corrigida?
3. Com que frequência as dependências são atualizadas?
4. Quem pode publicar uma nova versão em produção? Esse processo exige revisão?
5. Onde ficam guardadas as credenciais de publicação e de acesso aos servidores?

Respostas concretas, com processos e ferramentas definidos, são um bom sinal. Respostas genéricas indicam que o risco provavelmente não está sendo tratado.

## Um exemplo concreto

Uma empresa mantém uma loja virtual. Um fim de semana, é divulgada uma falha grave numa biblioteca de processamento de imagens muito usada.

- **Sem inventário**, a equipe precisa descobrir, sistema por sistema, se usa a biblioteca, direta ou indiretamente. Pode levar dias.
- **Com SBOM e alertas automáticos**, o repositório afetado já aparece sinalizado, com a versão exata e a versão corrigida. A atualização passa pelos testes automatizados e vai para produção no mesmo dia.

A diferença não está em ter uma equipe maior, e sim em ter os processos certos antes de precisar deles.

## Referências

- OWASP Foundation. [OWASP Top 10:2025](https://top10.owasp.org/2025/). Acesso em 29 set. 2026.
- CISA. [Software Bill of Materials (SBOM)](https://www.cisa.gov/sbom). Acesso em 29 set. 2026.
- SLSA. [Supply-chain Levels for Software Artifacts](https://slsa.dev/). Acesso em 29 set. 2026.
