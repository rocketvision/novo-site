---
title: Criptografia pós-quântica: por que o assunto já chegou às empresas
slug: criptografia-pos-quantica
subtitle: Os computadores quânticos capazes de quebrar a criptografia atual ainda não existem. O plano de migração, porém, já tem padrões e prazos.
excerpt: Em agosto de 2024, o NIST publicou os primeiros padrões de criptografia pós-quântica. Entenda o risco de "guardar agora e decifrar depois", o que dizem os novos padrões e como começar a se preparar.
category: tendencias
cover: pos-quantica
coverAlt: Reticulado de pontos claros em fundo escuro, com dois vetores partindo de um ponto central laranja.
seoTitle: Criptografia pós-quântica: padrões do NIST e prazos
seoDescription: O que é criptografia pós-quântica, os padrões FIPS 203, 204 e 205 do NIST, os prazos propostos para abandonar RSA e ECC e como sua empresa pode se preparar.
confirm:
  - Conferir a situação do NIST IR 8547 (versão final ou rascunho) e os prazos de 2030 e 2035 na data da publicação.
  - Conferir se o FIPS 206 (FN-DSA) já foi publicado.
---
Boa parte da segurança da internet depende de alguns algoritmos de criptografia de chave pública, como RSA e as curvas elípticas (ECC). Eles protegem as conexões HTTPS, as assinaturas digitais, as trocas de chaves em VPNs e muito mais. A segurança deles se baseia em problemas matemáticos que computadores comuns levariam um tempo impraticável para resolver.

O problema é que um **computador quântico** suficientemente grande e estável poderia resolver esses problemas de forma muito mais eficiente, usando algoritmos já conhecidos pela ciência. Ainda não existe uma máquina assim. Mas a comunidade de segurança não está esperando por ela, e há bons motivos para isso.

## O risco que já existe hoje

O principal argumento para começar agora tem nome: **guardar agora, decifrar depois** (*harvest now, decrypt later*). Um adversário pode capturar hoje comunicações criptografadas e armazená-las, esperando o dia em que conseguirá decifrá-las.

Para a maioria das informações, isso importa pouco: uma mensagem de hoje raramente terá valor daqui a muitos anos. Mas algumas informações precisam ficar protegidas por muito tempo: dados de saúde, segredos industriais, contratos, informações de governo, dados pessoais sensíveis. Para elas, a ameaça futura já é um risco presente.

Há um segundo motivo: **migrações de criptografia demoram**. Algoritmos estão embutidos em sistemas, protocolos, equipamentos e contratos. A história mostra que trocar um algoritmo amplamente usado leva muitos anos.

## Os primeiros padrões pós-quânticos

Criptografia pós-quântica é o nome dado a algoritmos projetados para resistir tanto a computadores comuns quanto a computadores quânticos, e que rodam nos equipamentos que já temos, sem exigir hardware quântico.

Depois de um processo público iniciado em 2016, com participação de pesquisadores do mundo todo, o **NIST publicou em 13 de agosto de 2024** os três primeiros padrões:

- **FIPS 203, ML-KEM** (derivado do CRYSTALS-Kyber): mecanismo de encapsulamento de chaves, usado para estabelecer uma chave secreta entre duas partes. É o padrão principal para criptografia geral, com chaves relativamente pequenas e boa velocidade.
- **FIPS 204, ML-DSA** (derivado do CRYSTALS-Dilithium): o padrão principal para **assinaturas digitais**.
- **FIPS 205, SLH-DSA** (derivado do SPHINCS+): outro padrão de assinatura, baseado em funções de hash, com uma abordagem matemática diferente, pensado como alternativa de reserva caso algum problema seja encontrado no ML-DSA.

O NIST também anunciou um quarto padrão, o FIPS 206, baseado no algoritmo FALCON (FN-DSA), e segue avaliando algoritmos adicionais como alternativas.

Os dois primeiros padrões se baseiam em problemas matemáticos sobre **reticulados**, estruturas regulares de pontos em muitas dimensões, que é o que a capa deste artigo sugere.

## Os prazos propostos

Em novembro de 2024, o NIST publicou para consulta pública o documento **NIST IR 8547**, com a proposta de transição. O rascunho prevê que os algoritmos vulneráveis a computadores quânticos com segurança de cerca de 112 bits, como RSA de 2048 bits e curvas de 256 bits, sejam **descontinuados a partir de 2030**, e que o uso de RSA e ECC para essas funções deixe de ser aprovado **a partir de 2035**.

Os prazos se referem às diretrizes do governo dos Estados Unidos, mas têm influência global: fornecedores de software, navegadores, sistemas operacionais e bibliotecas de criptografia seguem essas referências.

## O que já está acontecendo

A transição não é só planejamento. Navegadores e serviços de grande porte já passaram a oferecer **trocas de chave híbridas** nas conexões HTTPS, que combinam um algoritmo clássico com o ML-KEM. Na abordagem híbrida, a conexão só seria quebrada se os dois algoritmos fossem quebrados, o que dá segurança durante o período de transição.

Para a maioria das empresas, isso significa que parte da migração vai chegar por atualizações de navegadores, servidores e bibliotecas. Mas não toda.

## Como uma empresa pode se preparar

1. **Inventário criptográfico.** Descubra onde a criptografia de chave pública é usada: certificados, VPNs, assinaturas de documentos, integrações com parceiros, dispositivos, backups criptografados. É o passo mais trabalhoso e o mais importante.
2. **Classifique os dados pelo tempo de vida.** Quais informações precisam continuar confidenciais daqui a dez ou quinze anos? Elas são a prioridade.
3. **Pergunte aos fornecedores.** Qual é o plano de cada um para suportar os novos padrões? Em que prazo?
4. **Busque agilidade criptográfica.** Sistemas em que o algoritmo pode ser trocado por configuração, sem reescrever o software, vão sofrer muito menos nesta e nas próximas transições.
5. **Mantenha tudo atualizado.** Bibliotecas, servidores e sistemas operacionais atualizados recebem o suporte aos novos algoritmos à medida que ele fica disponível.
6. **Não improvise.** Use implementações consolidadas e testadas dos novos padrões. Criptografia caseira é um risco em qualquer época.

## O que é, afinal, um computador quântico

Computadores comuns processam informação em bits, que valem 0 ou 1. Computadores quânticos usam **qubits**, que exploram propriedades da física quântica, como a superposição e o emaranhamento. Para a maior parte das tarefas do dia a dia, isso não traz vantagem. Mas, para alguns problemas matemáticos específicos, existem algoritmos quânticos muito mais eficientes do que qualquer método conhecido para computadores comuns.

Um desses algoritmos, o de Shor, publicado em 1994, fatoraria números grandes e resolveria logaritmos discretos de forma eficiente, que são exatamente os problemas que sustentam o RSA e a criptografia de curvas elípticas. Para isso, porém, é preciso uma máquina com muito mais qubits estáveis do que as construídas até hoje. A criptografia simétrica, como o AES, e as funções de hash são bem menos afetadas; a recomendação geral é usar tamanhos de chave e de saída adequados.

## Nem pânico, nem descaso

Não há motivo para desligar sistemas ou fazer mudanças apressadas. Os algoritmos atuais continuam seguros contra os computadores que existem hoje. Mas a transição já tem padrões publicados e prazos propostos, e começa, como quase tudo em segurança, pelo inventário. Quem começa cedo transforma um problema futuro em manutenção planejada.

## Referências

- NIST. [NIST Releases First 3 Finalized Post-Quantum Encryption Standards](https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards). 13 ago. 2024. Acesso em 29 set. 2026.
- NIST. [NIST IR 8547 (Initial Public Draft): Transition to Post-Quantum Cryptography Standards](https://csrc.nist.gov/pubs/ir/8547/ipd). Nov. 2024. Acesso em 29 set. 2026.
