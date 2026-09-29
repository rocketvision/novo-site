---
title: Core Web Vitals: o que medem e por que o INP mudou a conversa sobre velocidade
slug: core-web-vitals-inp
subtitle: Carregar rápido não basta. Um site também precisa responder rápido quando alguém clica, e ficar parado enquanto a pessoa lê.
excerpt: LCP, INP e CLS são as três métricas que o Google usa para medir a experiência de carregamento, resposta e estabilidade de uma página. Entenda cada uma, os limites recomendados e o que costuma piorar os números.
category: desenvolvimento
cover: web-vitals
coverAlt: Três medidores semicirculares lado a lado, dois com o ponteiro em faixa laranja e um em faixa grafite.
seoTitle: Core Web Vitals: LCP, INP e CLS explicados
seoDescription: O que medem LCP, INP e CLS, os limites recomendados pelo Google, por que o INP substituiu o FID e as causas mais comuns de resultados ruins.
confirm:
  - Conferir se os limites das métricas continuam os mesmos na documentação do web.dev.
---
Todo mundo já passou por isso: a página abre, você vai clicar num botão, e no último instante um anúncio empurra tudo para baixo. Ou o botão parece não responder, você clica de novo e acaba fazendo a ação duas vezes. Essas pequenas frustrações têm nome, medida e limite recomendado. São os **Core Web Vitals**, um conjunto de métricas definido pelo Google para medir a experiência real de quem usa um site.

## As três métricas

Hoje, os Core Web Vitals são três. Os limites abaixo são os considerados **bons** pela documentação oficial do web.dev, medidos no percentil 75 das visitas reais, separando celular e computador. Ou seja: pelo menos 75% das visitas precisam ficar dentro do limite.

### LCP: o conteúdo principal apareceu?

O **Largest Contentful Paint** mede quanto tempo leva para o maior elemento visível da página, geralmente a imagem principal ou o bloco de texto do topo, ser exibido.

- Bom: até **2,5 segundos**.

### INP: a página respondeu quando eu interagi?

O **Interaction to Next Paint** mede quanto tempo a página leva para mostrar uma resposta visual depois de um clique, toque ou tecla. Ele observa as interações ao longo de toda a visita e reporta a mais lenta, desconsiderando casos extremos.

- Bom: até **200 milissegundos**.
- Precisa melhorar: de 200 a **500 milissegundos**.
- Ruim: acima de 500 milissegundos.

### CLS: a página ficou parada?

O **Cumulative Layout Shift** mede quanto o conteúdo se desloca inesperadamente enquanto a pessoa está vendo a página. É o anúncio que empurra o texto, a imagem que carrega sem espaço reservado, a fonte que troca e muda o tamanho das linhas.

- Bom: até **0,1**.

## Por que o INP mudou a conversa

Até março de 2024, a métrica de interatividade era o **FID** (*First Input Delay*). Ele media só o atraso da **primeira** interação, e só até o navegador começar a processá-la. Era possível ter um FID excelente e, ainda assim, uma página que travava a cada clique depois do carregamento.

Em **12 de março de 2024**, o INP substituiu oficialmente o FID como Core Web Vital. A diferença é grande: o INP considera **todas** as interações da visita e mede o caminho completo, do clique até a tela ser atualizada. Isso inclui o tempo de espera, o processamento do código e o trabalho de desenhar a tela de novo.

Na prática, o INP expôs um problema que muitos sites modernos escondiam: páginas que carregam rápido, mas executam JavaScript demais depois disso, deixando o navegador ocupado justamente quando a pessoa tenta usar o site.

## O que costuma piorar cada métrica

### LCP alto

- Imagem principal pesada, sem formato moderno (como WebP ou AVIF) e sem tamanho adequado para cada tela.
- Imagem principal carregada tarde, porque depende de JavaScript ou está marcada para carregamento preguiçoso.
- Servidor lento para responder a primeira requisição.
- Fontes e estilos que bloqueiam a renderização.

### INP alto

- **Tarefas longas** de JavaScript ocupando o navegador, principalmente scripts de terceiros (chat, análise, anúncios).
- Código que faz trabalho demais a cada clique, como recalcular listas enormes ou atualizar a página inteira por uma mudança pequena.
- Páginas com estrutura muito grande (muitos elementos), que tornam cada atualização da tela mais cara.

### CLS alto

- Imagens e vídeos sem largura e altura definidas.
- Banners, avisos de cookies e anúncios inseridos acima do conteúdo depois do carregamento.
- Troca de fonte que muda o tamanho do texto.

## Como medir

Há dois tipos de dados, e os dois importam:

- **Dados de campo**: vêm de visitas reais. São os que definem se o site "passa" nos Core Web Vitals. Aparecem no PageSpeed Insights e no Search Console, quando o site tem tráfego suficiente.
- **Dados de laboratório**: vêm de um teste simulado, como o Lighthouse. São úteis para diagnosticar e comparar mudanças, mas não substituem a experiência real, principalmente em celulares mais simples e conexões mais lentas.

Uma armadilha comum é testar só no computador do escritório, com internet rápida. Boa parte dos visitantes está no celular, e é aí que os problemas aparecem.

## Um exemplo típico de diagnóstico

Imagine a página de um produto que carrega em pouco mais de dois segundos no computador, mas tem INP ruim no celular. Um roteiro comum de investigação seria:

1. **Olhar os dados de campo** no PageSpeed Insights e confirmar que o problema está no celular e na interação, e não no carregamento.
2. **Reproduzir no laboratório**, simulando um aparelho mais lento nas ferramentas do navegador, e gravar o desempenho enquanto se clica nos elementos principais: seletor de tamanho, botão de comprar, abrir o menu.
3. **Identificar as tarefas longas**, os blocos de trabalho que ocupam o navegador por muito tempo. Com frequência, aparecem scripts de análise ou de chat rodando justamente na hora do clique, ou um componente que redesenha a página inteira para trocar uma informação pequena.
4. **Corrigir e medir de novo**: adiar o que não é urgente, dividir o trabalho pesado em partes menores e atualizar só o que mudou.

O ponto central é medir antes de otimizar. Palpites sobre desempenho costumam errar o alvo.

## Por que isso importa para o negócio

Velocidade não é vaidade técnica. Uma página que demora para mostrar o conteúdo perde visitantes antes de eles verem a oferta. Um botão que não responde gera cliques repetidos, pedidos duplicados e desconfiança. Um conteúdo que pula faz a pessoa clicar no lugar errado.

Os Core Web Vitals também fazem parte dos sinais de experiência de página considerados pelo Google. Eles não substituem conteúdo relevante, mas, entre páginas com conteúdo equivalente, a experiência pesa.

## Boas práticas que resolvem a maior parte dos casos

1. Sirva imagens em formato moderno, no tamanho certo para cada tela, e carregue a imagem principal com prioridade.
2. Reserve espaço para tudo que carrega depois: imagens, vídeos, anúncios e banners.
3. Reduza e adie o JavaScript que não é essencial para o primeiro uso da página.
4. Avalie cada script de terceiro: ele vale o custo que cobra da experiência?
5. Prefira renderizar o conteúdo no servidor e enviar ao navegador só o código necessário para a interação.
6. Acompanhe os dados de campo depois de cada mudança importante, e não só no dia do lançamento.

## Referências

- web.dev. [Web Vitals](https://web.dev/articles/vitals). Acesso em 29 set. 2026.
- web.dev. [Interaction to Next Paint (INP)](https://web.dev/articles/inp). Acesso em 29 set. 2026.
- web.dev. [Interaction to Next Paint becomes a Core Web Vital on March 12](https://web.dev/blog/inp-cwv-march-12). Acesso em 29 set. 2026.
