---
title: Zero Trust explicado para quem decide
slug: zero-trust-explicado
subtitle: O modelo de segurança que parte de uma premissa simples: estar dentro da rede não prova nada.
excerpt: Zero Trust troca a ideia de um perímetro confiável por verificação contínua de cada acesso. Entenda os princípios do NIST SP 800-207 e como começar sem grandes projetos.
category: ciberseguranca
cover: zero-trust
coverAlt: Perímetro tracejado apagado envolvendo vários recursos, cada um com o próprio anel de verificação, alguns destacados em laranja.
seoTitle: Zero Trust: o que é e como começar
seoDescription: Os princípios do Zero Trust segundo o NIST SP 800-207, por que o perímetro deixou de bastar e passos práticos para começar na sua empresa.
confirm:
  - Nenhum item pendente além da revisão editorial.
---
Durante muito tempo, a segurança das empresas seguiu a lógica do castelo: um muro forte em volta (firewall, VPN) e confiança do lado de dentro. Quem estava na rede do escritório era, por definição, alguém da casa.

Esse modelo envelheceu mal. Os sistemas saíram do servidor do escritório para a nuvem, as pessoas passaram a trabalhar de casa e do celular, e fornecedores acessam sistemas internos o tempo todo. Pior: quando um invasor consegue passar pelo muro, com uma senha vazada ou um computador comprometido, ele encontra do lado de dentro um ambiente em que quase tudo confia nele.

**Zero Trust** é a resposta a esse cenário. O nome assusta um pouco, mas a ideia é direta: nenhum acesso é confiável só por causa de onde vem. Cada pedido de acesso a um recurso precisa ser verificado.

## A definição do NIST

A referência mais usada é a publicação especial **NIST SP 800-207, Zero Trust Architecture**, de agosto de 2020. O documento descreve Zero Trust como um conjunto de paradigmas que tira o foco da defesa dos perímetros de rede estáticos e o coloca em **usuários, ativos e recursos**.

Dois pontos da definição merecem destaque:

- Não se deve conceder confiança implícita a um usuário ou equipamento com base apenas na sua localização na rede.
- Autenticação e autorização, tanto do usuário quanto do dispositivo, são funções separadas, realizadas **antes** de estabelecer uma sessão com um recurso da empresa.

## Os princípios, em linguagem de negócio

O NIST lista uma série de princípios. Traduzidos para o dia a dia de uma empresa, eles ficam assim:

### Tudo é recurso a proteger

Não só servidores: sistemas em nuvem, bancos de dados, aplicações internas, notebooks, celulares que acessam o e-mail corporativo. Se guarda ou acessa dados da empresa, entra no inventário.

### Toda comunicação é protegida, onde quer que aconteça

A rede do escritório não é tratada como mais segura que o Wi-Fi de um café. O tráfego é protegido nos dois casos.

### Acesso por sessão, com o mínimo necessário

Cada acesso vale para um recurso específico, por um tempo determinado, com as permissões estritamente necessárias. Ter acesso ao sistema financeiro não dá acesso automático ao sistema de RH.

### Decisões baseadas em contexto

A decisão de liberar ou não o acesso considera quem é a pessoa, de que dispositivo ela está vindo, se o dispositivo está atualizado, de onde vem o pedido, o horário e o comportamento recente. Um login de um país diferente, num dispositivo nunca visto, às três da manhã, merece mais verificação.

### Monitoramento contínuo

O estado de segurança dos equipamentos e dos acessos é acompanhado o tempo todo, e as informações coletadas alimentam as próximas decisões.

### Autenticação e autorização dinâmicas

Verificar uma vez, no começo do dia, não basta. A confiança é reavaliada ao longo da sessão.

## O que Zero Trust não é

Vale desfazer alguns equívocos comuns:

- **Não é um produto.** Fornecedores vendem ferramentas que ajudam, mas Zero Trust é uma estratégia de arquitetura. Nenhuma caixa instalada no servidor entrega o modelo pronto.
- **Não é desconfiar das pessoas.** O foco é não depender de confiança implícita. Para quem usa, o objetivo é que a verificação seja quase invisível na maioria das situações.
- **Não é tudo ou nada.** O próprio NIST trata a adoção como uma jornada, em que a empresa convive por um tempo com partes do modelo antigo e partes do novo.

## Por que isso importa para empresas pequenas e médias

É comum achar que Zero Trust é coisa de banco ou de governo. Mas os ataques mais frequentes contra empresas de qualquer tamanho exploram justamente a confiança implícita: uma senha roubada que dá acesso a tudo, um computador infectado que alcança todos os arquivos da rede, um fornecedor com acesso amplo demais.

O guia de prevenção a ransomware da CISA, agência de cibersegurança dos Estados Unidos, recomenda explicitamente a adoção de arquitetura Zero Trust, ao lado de autenticação multifator resistente a phishing e segmentação de rede. Não por acaso: são as medidas que limitam o estrago quando um invasor consegue o primeiro acesso.

## Por onde começar

Não é preciso um grande projeto. Alguns passos já mudam bastante o cenário:

1. **Inventário.** Liste sistemas, dados importantes, contas e dispositivos. Não se protege o que não se conhece.
2. **Autenticação forte em tudo que é crítico.** Comece por e-mail, sistemas financeiros, painéis de administração e acesso remoto. Prefira métodos resistentes a phishing, como chaves de segurança e passkeys.
3. **Revisão de permissões.** Quem tem acesso de administrador e por quê? Contas de ex-funcionários e de fornecedores antigos continuam ativas?
4. **Acesso por aplicação, não por rede.** Em vez de uma VPN que coloca o usuário "dentro" de toda a rede, prefira dar acesso a cada aplicação específica, com verificação a cada acesso.
5. **Saúde dos dispositivos.** Só permita acesso a dados sensíveis a partir de equipamentos atualizados e gerenciados.
6. **Registro e alerta.** Centralize os registros de acesso e defina alertas para situações fora do padrão.

## Como medir o avanço

Uma estratégia de longo prazo precisa de sinais concretos de progresso. Alguns indicadores simples ajudam a acompanhar a adoção sem depender de ferramentas caras:

- **Cobertura de autenticação multifator**: qual porcentagem das contas, e principalmente das contas com privilégio, já usa um segundo fator? E quantas usam um método resistente a phishing?
- **Contas privilegiadas**: quantas pessoas têm acesso de administrador em cada sistema? O número está diminuindo ou só cresce?
- **Acessos órfãos**: quantas contas de ex-funcionários, estagiários e fornecedores continuam ativas depois do fim do vínculo? O ideal é zero, com desligamento no mesmo dia.
- **Dispositivos conhecidos**: que parte dos acessos a dados sensíveis vem de equipamentos gerenciados e atualizados?
- **Tempo de resposta**: quando um acesso suspeito acontece, em quanto tempo alguém fica sabendo?

Revisar esses números a cada trimestre transforma o Zero Trust de um conceito em um plano com metas. E ajuda a mostrar para a liderança onde o investimento está fazendo diferença.

## Nos sistemas que desenvolvemos

Zero Trust também vale dentro do software. Em sistemas sob medida, isso significa: toda requisição verificada no servidor, sem confiar no que a tela "esconde"; permissões por recurso, e não só por tela; sessões com prazo; e registro de quem fez o quê. São decisões de arquitetura que custam pouco no começo do projeto e muito para retrofitar depois.

## Referências

- NIST. [SP 800-207, Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final). Agosto de 2020. Acesso em 29 set. 2026.
- CISA, MS-ISAC, NSA e FBI. [#StopRansomware Guide](https://www.cisa.gov/stopransomware/ransomware-guide). Versão de setembro de 2023. Acesso em 29 set. 2026.
