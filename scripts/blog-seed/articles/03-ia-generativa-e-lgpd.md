---
title: IA generativa e LGPD: cuidados com dados pessoais antes de automatizar
slug: ia-generativa-e-lgpd
subtitle: A lei de proteção de dados não proíbe o uso de IA, mas exige que a empresa saiba quais dados usa, para quê e com que proteção.
excerpt: Usar IA generativa com dados de clientes e funcionários envolve a LGPD do começo ao fim. Veja os princípios que mais pesam, os direitos dos titulares e um roteiro prático de cuidados.
category: inteligencia-artificial
cover: ia-lgpd
coverAlt: Grade de pontos claros em fundo escuro, parte deles substituída por quadrados laranja, ao lado de um escudo com sinal de verificação.
seoTitle: IA generativa e LGPD: cuidados com dados pessoais
seoDescription: Como a LGPD se aplica ao uso de IA generativa nas empresas: princípios, revisão de decisões automatizadas, segurança e um roteiro prático.
confirm:
  - Conferir a redação dos artigos citados da LGPD no Planalto (o site estava fora do ar na consulta) e se houve alterações.
  - Verificar publicações recentes da ANPD sobre inteligência artificial antes de publicar.
  - Conferir a situação do PL 2338/2023 na Câmara dos Deputados.
---
Resumir atendimentos, classificar currículos, responder clientes, analisar contratos: boa parte das aplicações de IA generativa em empresas passa, cedo ou tarde, por dados pessoais. E, no Brasil, dados pessoais significam **LGPD**, a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).

A lei não tem um capítulo específico sobre inteligência artificial, e não precisa ter. Ela se aplica a qualquer tratamento de dados pessoais, seja feito por uma pessoa, por uma planilha ou por um modelo de linguagem. O que muda com a IA é a escala e a facilidade com que os dados circulam, e isso torna alguns cuidados mais urgentes.

*Este artigo tem caráter informativo e não substitui orientação jurídica para o caso concreto da sua empresa.*

## Onde os dados pessoais aparecem num projeto de IA

Antes de falar de regras, vale mapear os pontos de contato. Em um projeto típico, dados pessoais podem estar:

- **No que se envia ao modelo**: a pergunta do usuário, o histórico do cliente, um documento anexado.
- **No contexto de apoio**: bases internas consultadas para responder (cadastros, tickets, e-mails).
- **No que o modelo devolve**: resumos, classificações e respostas que citam pessoas.
- **Nos registros**: logs de uso guardados para auditoria e melhoria.
- **No fornecedor**: quando a IA é um serviço de terceiros, os dados trafegam e podem ser processados fora da empresa.

Cada um desses pontos é um tratamento de dados, e cada um precisa de uma resposta para as perguntas básicas da lei: com que finalidade, com que base legal, por quanto tempo e com que segurança.

## Os princípios que mais pesam

O artigo 6º da LGPD lista os princípios que qualquer tratamento deve respeitar. Em projetos de IA, alguns ganham destaque:

- **Finalidade**: os dados devem ser tratados para propósitos legítimos, específicos e informados ao titular. Usar a base de clientes coletada para entrega de pedidos para treinar um modelo de marketing é uma mudança de finalidade que precisa ser avaliada.
- **Necessidade**: tratar só o mínimo necessário. Se o modelo precisa classificar o assunto de uma mensagem, não precisa receber o CPF do cliente.
- **Transparência**: o titular deve ter informações claras sobre o tratamento. Se um atendimento é feito ou apoiado por IA, isso deve estar comunicado.
- **Segurança e prevenção**: medidas técnicas e administrativas para proteger os dados e evitar danos.
- **Não discriminação**: o tratamento não pode ser usado para fins discriminatórios ilícitos ou abusivos, um ponto sensível quando a IA ajuda a decidir sobre crédito, contratação ou preço.
- **Responsabilização e prestação de contas**: a empresa precisa conseguir demonstrar que adotou medidas eficazes.

## Decisões automatizadas e o direito à revisão

O artigo 20 da LGPD garante ao titular o direito de solicitar a **revisão de decisões tomadas unicamente com base em tratamento automatizado** de dados pessoais que afetem seus interesses, incluindo decisões que definem perfil pessoal, profissional, de consumo e de crédito. A lei também prevê que o controlador forneça, quando solicitado, informações claras sobre os critérios e procedimentos usados, observados os segredos comercial e industrial.

Na prática, se a IA decide sozinha algo relevante sobre uma pessoa, a empresa precisa de um caminho para que essa decisão seja revista e explicada. Um bom desenho de sistema já prevê isso: registrar os fatores usados, manter uma pessoa responsável pelo processo e ter um canal para pedidos de revisão.

## Segurança: o artigo 46 na era da IA

O artigo 46 exige que os agentes de tratamento adotem medidas de segurança, técnicas e administrativas, aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas. Em projetos de IA, isso se traduz em cuidados como:

- **Controle de acesso** na base consultada pelo modelo, para que um usuário não receba dados de outro.
- **Proteção contra injeção de instruções**, que pode levar o sistema a revelar informações indevidas (tratamos disso em outro artigo do Blog).
- **Minimização e mascaramento**: remover ou substituir dados identificadores antes de enviá-los ao modelo quando eles não são necessários para a tarefa.
- **Retenção limitada** dos registros de conversa, com prazo definido e justificado.
- **Avaliação do fornecedor**: onde os dados são processados, se são usados para treinar modelos, por quanto tempo ficam guardados e que garantias contratuais existem.

## Fornecedores e transferência internacional

Muitas ferramentas de IA generativa são oferecidas por empresas estrangeiras, e os dados podem ser processados fora do Brasil. A LGPD tem regras próprias para **transferência internacional de dados**, e a ANPD regulamentou o tema. Antes de contratar, vale verificar com o jurídico se o contrato e as garantias do fornecedor atendem a essas regras, e se há opção de processamento em região específica ou de não uso dos dados para treinamento.

## Relatório de impacto

A LGPD prevê o **Relatório de Impacto à Proteção de Dados Pessoais**, que a ANPD pode exigir do controlador (artigo 38). Mesmo quando não é exigido, elaborar esse relatório para projetos de IA que tratam dados em volume, dados sensíveis ou que tomam decisões sobre pessoas é uma boa prática: força a equipe a descrever o tratamento, os riscos e as medidas de mitigação antes de colocar o sistema em uso.

## Um roteiro prático

Para quem está começando um projeto de IA com dados pessoais:

1. **Descreva o caso de uso** em uma página: objetivo, dados envolvidos, quem usa, que decisões o sistema toma.
2. **Mapeie o fluxo de dados**, do usuário ao modelo, ao fornecedor e aos registros.
3. **Defina a base legal** para cada tratamento, com apoio do encarregado de dados (DPO).
4. **Minimize**: tire do fluxo tudo que não é necessário para a tarefa.
5. **Avalie o fornecedor** e ajuste o contrato.
6. **Garanta transparência**: atualize a política de privacidade e informe o uso de IA nos pontos de contato.
7. **Preveja revisão humana** para decisões que afetam pessoas.
8. **Registre e revise**: mantenha a documentação atualizada e reavalie quando o sistema mudar.

## O cenário regulatório está se movendo

Além da LGPD, o Brasil discute uma lei específica para inteligência artificial. O Projeto de Lei nº 2338/2023 foi aprovado pelo Senado Federal em dezembro de 2024 e enviado à Câmara dos Deputados, onde segue em análise. A ANPD também tem publicado documentos e orientações sobre IA e proteção de dados. Acompanhar esse movimento ajuda a tomar hoje decisões de arquitetura que não precisarão ser desfeitas amanhã.

## Referências

- Brasil. [Lei nº 13.709, de 14 de agosto de 2018 (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm). Acesso em 29 set. 2026.
- ANPD. [Documentos técnicos e orientativos](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos). Acesso em 29 set. 2026.
- Senado Federal. [PL 2338/2023, Marco Legal da Inteligência Artificial](https://www25.senado.leg.br/web/atividade/materias/-/materia/157233). Acesso em 29 set. 2026.
