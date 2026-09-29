---
title: Acessibilidade digital: o que muda com a WCAG 2.2 e o que a lei brasileira exige
slug: acessibilidade-digital-wcag-22
subtitle: Um site acessível atende mais gente, funciona melhor para todos e cumpre uma obrigação legal que muita empresa desconhece.
excerpt: A WCAG 2.2 adicionou nove critérios às diretrizes de acessibilidade na web, e a Lei Brasileira de Inclusão torna a acessibilidade obrigatória nos sites de empresas com atuação no país. Veja o essencial e por onde começar.
category: desenvolvimento
cover: acessibilidade
coverAlt: Botão arredondado com contorno laranja de foco visível ao lado de outro botão sem foco, e dois grupos de alvos circulares, um deles preenchido em laranja.
seoTitle: Acessibilidade digital: WCAG 2.2 e a lei brasileira
seoDescription: Os nove novos critérios da WCAG 2.2, o que a Lei Brasileira de Inclusão exige dos sites de empresas e um roteiro prático para tornar seu site acessível.
confirm:
  - Conferir a redação do art. 63 da Lei nº 13.146/2015 no Planalto.
---
Acessibilidade digital é a prática de construir sites e sistemas que possam ser usados por todas as pessoas, incluindo quem tem deficiência visual, auditiva, motora ou cognitiva, e também quem está numa situação temporária de limitação: o braço quebrado, a tela ao sol, a conexão lenta, a idade que deixa a letra pequena difícil de ler.

Não é um detalhe de acabamento. Uma página que não funciona com leitor de tela, que depende de cor para transmitir informação ou que não pode ser usada só pelo teclado exclui pessoas. E, no Brasil, também descumpre a lei.

## O que a lei brasileira diz

A **Lei Brasileira de Inclusão da Pessoa com Deficiência** (Lei nº 13.146/2015) trata do tema no artigo 63, que torna **obrigatória a acessibilidade nos sítios da internet mantidos por empresas com sede ou representação comercial no país ou por órgãos de governo**, para uso da pessoa com deficiência, garantindo acesso às informações disponíveis, conforme as melhores práticas e diretrizes de acessibilidade adotadas internacionalmente.

A referência internacional mais usada para essas "melhores práticas" são as **Diretrizes de Acessibilidade para Conteúdo Web**, a WCAG, publicadas pelo W3C.

## WCAG em poucas palavras

A WCAG organiza a acessibilidade em quatro princípios. O conteúdo precisa ser:

- **Perceptível**: a informação precisa chegar à pessoa por algum sentido. Imagens com texto alternativo, vídeos com legenda, contraste suficiente entre texto e fundo.
- **Operável**: todas as funções precisam poder ser usadas, inclusive só pelo teclado, sem exigir movimentos precisos e com tempo suficiente.
- **Compreensível**: textos claros, comportamento previsível e ajuda para evitar e corrigir erros.
- **Robusto**: o código precisa funcionar bem com navegadores e tecnologias assistivas, como leitores de tela.

Cada princípio se desdobra em critérios de sucesso, classificados em três níveis: **A** (o mínimo), **AA** (o nível geralmente adotado como meta) e **AAA** (o mais exigente).

## O que a WCAG 2.2 trouxe de novo

A versão 2.2 se tornou recomendação do W3C em **5 de outubro de 2023** e adicionou **nove critérios** em relação à 2.1. Eles focam principalmente em pessoas com baixa visão, dificuldades motoras e dificuldades cognitivas:

- **2.4.11 Foco não encoberto (mínimo), AA**: o elemento que recebe o foco do teclado não pode ficar totalmente escondido, por exemplo, atrás de um cabeçalho fixo ou de um aviso de cookies.
- **2.4.12 Foco não encoberto (aprimorado), AAA**: nenhuma parte do elemento focado fica encoberta.
- **2.4.13 Aparência do foco, AAA**: o indicador de foco precisa ter tamanho e contraste suficientes.
- **2.5.7 Movimentos de arrastar, AA**: tudo o que exige arrastar precisa ter uma alternativa com um toque ou clique simples.
- **2.5.8 Tamanho do alvo (mínimo), AA**: botões e links precisam ter área de toque de pelo menos 24 por 24 pixels CSS, ou espaço suficiente em volta, com algumas exceções.
- **3.2.6 Ajuda consistente, A**: se o site oferece canais de ajuda (contato, chat, perguntas frequentes), eles aparecem no mesmo lugar em todas as páginas.
- **3.3.7 Entrada redundante, A**: não pedir de novo, no mesmo processo, uma informação que a pessoa já informou, a menos que seja necessário.
- **3.3.8 Autenticação acessível (mínimo), AA**: o login não pode depender de um teste cognitivo, como memorizar ou transcrever algo, sem oferecer alternativa. Permitir colar a senha e usar gerenciadores de senha ajuda a cumprir este critério.
- **3.3.9 Autenticação acessível (aprimorado), AAA**: a mesma ideia, com menos exceções.

A versão 2.2 também **retirou** um critério antigo, o 4.1.1 (análise do código), considerado obsoleto diante da forma como navegadores e tecnologias assistivas funcionam hoje.

## Os problemas mais comuns

Na prática, a maioria das barreiras encontradas em sites vem de um conjunto pequeno de falhas:

- Imagens informativas **sem texto alternativo**, ou com textos inúteis como "imagem1.jpg".
- **Contraste baixo** entre texto e fundo, principalmente em textos cinza-claro.
- Formulários com campos **sem rótulo** associado, em que o leitor de tela anuncia só "campo de edição".
- Mensagens de erro que aparecem só com **cor**, sem texto.
- Elementos clicáveis que **não funcionam pelo teclado**, ou que funcionam sem mostrar onde está o foco.
- Janelas e menus que prendem o foco ou que não podem ser fechados com a tecla Esc.
- Vídeos sem legenda.

## Um roteiro para começar

1. **Teste com o teclado.** Navegue pelo site usando só Tab, Shift+Tab, Enter e Esc. Dá para chegar a tudo? Dá para ver onde está o foco?
2. **Use uma ferramenta automática** de verificação de acessibilidade. Elas encontram parte dos problemas, como falta de texto alternativo e contraste baixo. Não encontram tudo, mas são um bom ponto de partida.
3. **Teste com um leitor de tela**, como o NVDA no Windows ou o VoiceOver no Mac e no iPhone, pelo menos nos fluxos principais: página inicial, contato, compra, login.
4. **Revise formulários**: rótulos visíveis, mensagens de erro em texto, instruções claras.
5. **Defina a meta**: a WCAG 2.2 nível AA é a referência mais usada.
6. **Inclua acessibilidade no processo**, e não só no fim. Componentes acessíveis desde o design custam muito menos do que correções depois do lançamento.

## Acessibilidade e SEO andam juntos

Muitas práticas de acessibilidade também ajudam os buscadores a entender a página. Títulos organizados em hierarquia (um título principal e seções abaixo dele), textos alternativos que descrevem as imagens, links com texto que explica o destino ("veja o guia de instalação" em vez de "clique aqui") e conteúdo em texto, e não dentro de imagens, beneficiam ao mesmo tempo quem usa leitor de tela e os robôs que indexam o site.

O mesmo vale para a velocidade: páginas leves e estáveis são mais fáceis de usar com tecnologias assistivas e em aparelhos mais simples. Acessibilidade, desempenho e SEO são, em boa parte, a mesma disciplina: fazer um site que funcione bem para quem chega até ele, qualquer que seja o jeito de chegar.

## Acessibilidade beneficia todo mundo

Legendas ajudam quem assiste a um vídeo sem som no transporte público. Bom contraste ajuda quem usa o celular ao sol. Alvos de toque maiores ajudam qualquer pessoa com pressa. Formulários claros reduzem erros de todos os usuários. Um site acessível é, quase sempre, simplesmente um site melhor.

## Referências

- W3C. [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/). Acesso em 29 set. 2026.
- W3C WAI. [WCAG 2.2 is a W3C Recommendation](https://www.w3.org/WAI/news/2023-10-05/wcag22rec/). 5 out. 2023. Acesso em 29 set. 2026.
- Brasil. [Lei nº 13.146, de 6 de julho de 2015 (Lei Brasileira de Inclusão)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm). Acesso em 29 set. 2026.
