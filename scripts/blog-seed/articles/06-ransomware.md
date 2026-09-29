---
title: Ransomware: o que fazer antes do ataque acontecer
slug: ransomware-como-se-preparar
subtitle: A recuperação de um ataque de ransomware começa meses antes dele, com backups testados, acessos bem controlados e um plano que todos conhecem.
excerpt: O guia #StopRansomware, da CISA e de outras agências dos Estados Unidos, reúne as práticas de preparação mais importantes. Veja o que priorizar e como adaptar à realidade de uma empresa brasileira.
category: ciberseguranca
cover: ransomware
coverAlt: Anel dividido em quatro arcos, um deles em laranja, em volta de um cadeado branco sobre círculo grafite, representando o ciclo de preparação e resposta.
seoTitle: Ransomware: como se preparar antes do ataque
seoDescription: As práticas de preparação contra ransomware do guia #StopRansomware da CISA: backups offline, MFA resistente a phishing, atualizações e plano de resposta.
confirm:
  - Conferir se há versão mais nova do #StopRansomware Guide que a de setembro de 2023.
---
Ransomware é um tipo de ataque em que o invasor bloqueia o acesso aos dados de uma empresa, geralmente criptografando arquivos e sistemas, e exige pagamento para devolvê-los. Nas versões mais recentes, o criminoso também copia os dados antes e ameaça divulgá-los, o que aumenta a pressão sobre a vítima.

A parte mais importante da defesa contra ransomware acontece **antes** do ataque. Quando a tela de resgate aparece, as opções da empresa já foram definidas pelo que ela fez ou deixou de fazer nos meses anteriores: se tem backups que funcionam, se o invasor conseguiu se espalhar pela rede, se alguém sabe o que fazer primeiro.

A principal referência pública sobre o tema é o **#StopRansomware Guide**, publicado pela CISA, a agência de cibersegurança dos Estados Unidos, em conjunto com MS-ISAC, NSA e FBI. A versão atual é de setembro de 2023. Abaixo, organizamos as práticas de preparação do guia em ordem de prioridade para a realidade de empresas de pequeno e médio porte.

## 1. Backups que sobrevivem ao ataque

O guia recomenda manter **backups offline e criptografados** dos dados críticos e **testar regularmente** se eles estão íntegros e disponíveis. Cada parte dessa frase importa:

- **Offline**: grupos de ransomware procuram ativamente os backups acessíveis pela rede para apagá-los ou criptografá-los junto com o resto. Um backup que o invasor alcança não é uma garantia.
- **Criptografados**: o backup também é uma cópia dos seus dados. Se for roubado, não pode ser lido.
- **Testados**: muitas empresas só descobrem que o backup não funciona no dia em que precisam dele. Faça restaurações de teste periódicas e cronometre quanto tempo levam.

Também vale guardar cópias das configurações essenciais (servidores, rede, sistemas em nuvem) e documentar o passo a passo da reconstrução.

## 2. Autenticação forte, a começar pelo que é exposto

Grande parte dos ataques começa com uma credencial roubada. O guia recomenda **autenticação multifator resistente a phishing** para todos os serviços possíveis, com prioridade para e-mail, VPN e contas com acesso a sistemas críticos. Métodos como chaves de segurança e passkeys se encaixam nessa categoria; códigos por SMS são melhores do que nada, mas podem ser interceptados ou capturados em páginas falsas.

Junto com isso:

- Desative contas que não são mais usadas, inclusive de ex-funcionários e fornecedores.
- Separe contas de administrador das contas de uso diário.
- Aplique o **menor privilégio**: cada pessoa acessa o que precisa para o trabalho, e nada além.

## 3. Atualizações e vulnerabilidades conhecidas

Serviços expostos à internet com falhas conhecidas estão entre as portas de entrada mais comuns. O guia recomenda varredura regular de vulnerabilidades e aplicação rápida de correções, com prioridade para:

- Serviços de acesso remoto (VPN, área de trabalho remota).
- Sistemas acessíveis pela internet.
- Vulnerabilidades que já estão sendo exploradas em ataques reais. A CISA mantém um catálogo público delas, o *Known Exploited Vulnerabilities*.

Nunca deixe a área de trabalho remota (RDP) exposta diretamente à internet.

## 4. Limitar o alcance de um invasor

Quando o primeiro computador é comprometido, a pergunta passa a ser até onde o invasor consegue ir. O guia recomenda:

- **Segmentação de rede**, separando sistemas críticos, estações de trabalho e equipamentos de convidados.
- **Inventário de ativos** atualizado, para saber o que existe e o que precisa ser protegido.
- Adoção progressiva de uma **arquitetura Zero Trust**, em que nenhum acesso é confiável só por estar dentro da rede.

## 5. Um plano de resposta que existe fora do computador

O guia recomenda criar, manter e **exercitar** um plano de resposta a incidentes, com os procedimentos de comunicação e notificação, aprovado pela liderança e disponível também em **papel**. Se os sistemas estiverem criptografados, o plano guardado num servidor da empresa não vai ajudar.

Um bom plano responde, no mínimo:

1. Quem decide o que durante o incidente?
2. Como isolar rapidamente os sistemas afetados?
3. Quem deve ser avisado, em que ordem e por qual canal? Inclua clientes, parceiros, seguradora, assessoria jurídica e autoridades.
4. Onde estão os backups e quem sabe restaurá-los?
5. Quais sistemas voltam primeiro?

No Brasil, se o incidente envolver dados pessoais e puder causar risco ou dano relevante aos titulares, a LGPD exige comunicação à ANPD e aos titulares. O Regulamento de Comunicação de Incidente de Segurança da ANPD (Resolução CD/ANPD nº 15/2024) estabelece prazo de três dias úteis para essa comunicação, com possibilidade de complementação posterior. Vale incluir esse passo no plano e conferir os detalhes com o jurídico.

## 6. Pessoas preparadas

Parte dos ataques começa com um e-mail. O guia recomenda programas de **conscientização** que ensinem a reconhecer mensagens suspeitas e, principalmente, a **reportar** rapidamente o que parece estranho. Uma equipe que avisa em minutos dá tempo para conter o problema.

## 7. Ensaie antes de precisar

Um plano que nunca foi testado costuma falhar no primeiro minuto. O guia recomenda exercitar o plano de resposta regularmente, e um formato simples funciona bem para empresas de qualquer porte: o **exercício de mesa**.

Reúna as pessoas que teriam papel num incidente real, como direção, TI, jurídico e comunicação, e apresente um cenário: "Segunda-feira, 8h, os computadores do financeiro mostram uma mensagem de resgate". A cada etapa, pergunte o que cada um faria, quem avisaria quem e onde estão as informações necessárias. Em uma ou duas horas, surgem as lacunas que nenhum documento revela: o telefone do fornecedor que ninguém tem, o backup que só uma pessoa sabe restaurar, a senha do painel da nuvem guardada num computador que estaria criptografado.

Depois do exercício, atualize o plano, distribua a versão impressa e repita o ensaio periodicamente.

## E se acontecer?

O guia também traz uma lista de verificação para a resposta, que começa por identificar e **isolar** imediatamente os sistemas afetados, desconectando-os da rede. Duas recomendações merecem destaque:

- Registre tudo o que for feito, com horários.
- Acione as autoridades e a assessoria jurídica. O FBI, uma das agências que assinam o guia, afirma não apoiar o pagamento de resgate: pagar não garante a devolução dos dados, e há casos de vítimas que pagaram e nunca receberam a chave para recuperá-los.

## Por onde começar amanhã

Se tudo isso parece muito, comece por três perguntas:

1. **Conseguimos restaurar nossos dados críticos a partir de um backup que o invasor não alcança?** Teste.
2. **Todos os acessos remotos e o e-mail têm autenticação multifator?** Se não, comece por eles.
3. **Se tudo parar amanhã, alguém sabe o primeiro telefone a ligar?** Escreva e imprima.

Responder bem a essas três já coloca a empresa em outro patamar.

## Referências

- CISA, MS-ISAC, NSA e FBI. [#StopRansomware Guide](https://www.cisa.gov/stopransomware/ransomware-guide). Setembro de 2023. Acesso em 29 set. 2026.
- CISA. [Known Exploited Vulnerabilities Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog). Acesso em 29 set. 2026.
- FBI e CISA. [Ransomware: What It Is and What To Do About It](https://www.cisa.gov/sites/default/files/Ransomware_Trifold_e-version.pdf). Acesso em 29 set. 2026.
- ANPD. [Comunicação de incidente de segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis). Acesso em 29 set. 2026.
