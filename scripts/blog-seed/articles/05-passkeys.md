---
title: Passkeys: como funciona o login sem senha e por que ele resiste ao phishing
slug: passkeys-login-sem-senha
subtitle: Uma chave criptográfica presa ao seu aparelho no lugar de uma senha que pode ser adivinhada, reutilizada ou roubada.
excerpt: Passkeys usam criptografia de chave pública para substituir senhas. Entenda como funcionam, a diferença entre passkeys sincronizadas e presas ao dispositivo e o que muda para quem desenvolve sistemas.
category: ciberseguranca
cover: passkeys
coverAlt: Celular estilizado com uma chave laranja, ligado por duas linhas a um painel de servidor, representando o par de chaves de uma passkey.
seoTitle: Passkeys: login sem senha e resistente a phishing
seoDescription: Como passkeys funcionam, por que resistem a phishing, a diferença entre sincronizadas e presas ao dispositivo e o que dizem FIDO Alliance e NIST.
confirm:
  - Conferir a versão final e a data do NIST SP 800-63B-4 citada.
---
Senhas têm um problema de origem: são um segredo que precisa ser lembrado por uma pessoa e conhecido por um sistema. Isso abre várias portas. Senhas fracas são adivinhadas. Senhas repetidas vazam de um site e funcionam em outro. E mesmo uma senha forte e única pode ser digitada numa página falsa, idêntica à verdadeira, montada para roubá-la.

As **passkeys** atacam o problema pela raiz: em vez de um segredo compartilhado, usam um par de chaves criptográficas. O usuário entra com o mesmo gesto que usa para desbloquear o celular ou o computador, como a digital, o rosto ou um PIN, e nenhuma senha trafega pela internet.

## O que é uma passkey

A FIDO Alliance, consórcio que desenvolve os padrões de autenticação usados pelas passkeys, define a passkey como uma credencial de autenticação baseada nos padrões FIDO, que pode ficar guardada no celular, no computador ou em uma chave de segurança física. O padrão web por trás do funcionamento no navegador é o **WebAuthn**, publicado pelo W3C.

Na prática, o funcionamento é este:

1. **No cadastro**, o aparelho do usuário cria um par de chaves exclusivo para aquele site. A **chave privada** fica guardada no aparelho (ou no gerenciador de senhas do usuário). A **chave pública** vai para o servidor do site.
2. **No login**, o servidor envia um desafio, uma sequência aleatória. O aparelho pede ao usuário a biometria ou o PIN e, se estiver tudo certo, assina o desafio com a chave privada.
3. **O servidor confere** a assinatura com a chave pública que já tem. Se bater, o login está feito.

A chave privada nunca sai do aparelho durante o login. O servidor guarda só a chave pública, que não serve para nada nas mãos de um invasor. Um vazamento do banco de dados do site, portanto, não expõe credenciais que possam ser usadas para entrar.

## Por que resiste ao phishing

Esse é o ponto mais importante. Cada passkey é vinculada ao **domínio** do site em que foi criada. Quando alguém cai numa página falsa, com um endereço parecido, o navegador simplesmente não oferece a passkey do site verdadeiro, porque o domínio não bate. Não há o que digitar, e portanto não há o que roubar.

Compare com os métodos de segundo fator mais comuns. Um código enviado por SMS ou gerado por aplicativo pode ser digitado pela vítima numa página falsa e repassado em tempo real ao site verdadeiro pelo atacante. A passkey fecha essa porta por desenho.

É por isso que o guia de prevenção a ransomware da CISA recomenda **autenticação multifator resistente a phishing** e cita alternativas sem senha baseadas em verificação criptográfica.

## Sincronizadas ou presas ao dispositivo

A FIDO Alliance distingue dois tipos:

- **Passkeys sincronizadas**: ficam no gerenciador de credenciais do sistema ou de um fornecedor e são copiadas, com criptografia de ponta a ponta, entre os aparelhos do usuário. Se o celular quebrar, a passkey continua disponível no computador ou no aparelho novo. É o tipo mais comum para consumidores.
- **Passkeys presas ao dispositivo**: nunca saem de um único equipamento, como uma chave de segurança física. Oferecem uma garantia mais forte de posse, ao custo de exigir um plano para perda do dispositivo.

As duas resistem a phishing. A diferença está no equilíbrio entre conveniência, recuperação e o nível de garantia exigido.

## O que diz o NIST

A revisão 4 das diretrizes de identidade digital do NIST (SP 800-63B-4) incorporou os autenticadores sincronizáveis. Segundo o documento, eles podem ser usados nos níveis de garantia mais comuns, com requisitos para a proteção da sincronização, mas **não** no nível mais alto (AAL3), que exige chaves que não possam ser exportadas.

A mesma diretriz também mudou recomendações antigas sobre senhas, para quem ainda depende delas:

- Não impor regras de composição (obrigar maiúscula, número e símbolo).
- Não exigir troca periódica de senha sem motivo.
- Exigir tamanho mínimo de 15 caracteres quando a senha é o único fator, e de 8 quando faz parte de uma autenticação multifator.
- Comparar senhas novas com listas de senhas comuns, esperadas ou vazadas, e recusar as que aparecerem.

## Na prática, para quem usa

Para o usuário, a experiência costuma ser mais simples que a da senha:

1. O site oferece "criar uma passkey", geralmente depois do login ou nas configurações de segurança.
2. O aparelho pede a digital, o rosto ou o PIN.
3. Nos próximos acessos, basta escolher a passkey e confirmar com o mesmo gesto.

Vale saber que a biometria não é enviada ao site. Ela só destrava a chave no próprio aparelho.

## Na prática, para quem desenvolve

Adotar passkeys num sistema exige alguns cuidados:

- **Use bibliotecas consolidadas** de WebAuthn no servidor, em vez de implementar a verificação do zero.
- **Planeje a recuperação de conta.** Se o usuário perder todos os aparelhos, qual é o caminho de volta? Um processo de recuperação fraco anula a segurança da passkey.
- **Permita várias passkeys por conta**, por exemplo, uma no celular e outra numa chave física.
- **Conviva com senhas por um tempo.** A migração costuma ser gradual: ofereça a passkey como opção, incentive o uso e só depois pense em desativar senhas.
- **Registre e mostre ao usuário** onde há passkeys cadastradas, com a opção de removê-las.

## Dúvidas comuns

**E se eu perder o celular?** Com passkeys sincronizadas, elas continuam disponíveis nos outros aparelhos ligados à mesma conta do sistema ou do gerenciador de senhas. Com passkeys presas a um dispositivo, o recomendado é cadastrar mais de uma, por exemplo, uma chave física reserva guardada em local seguro.

**Posso usar a passkey do celular para entrar pelo computador de outra pessoa?** Sim. O navegador pode mostrar um código QR que o celular lê; a autenticação acontece no celular, que se comunica com o computador por proximidade. A chave privada não é copiada para o computador.

**O site fica sabendo da minha digital?** Não. A biometria é verificada localmente pelo aparelho e só serve para liberar o uso da chave. O site recebe apenas a assinatura criptográfica.

**Passkey substitui a autenticação multifator?** Na prática, uma passkey já combina dois fatores: algo que você tem (o aparelho com a chave) e algo que você é ou sabe (biometria ou PIN). Por isso muitos serviços dispensam o código extra quando o login é feito com passkey.

## Vale a pena?

Para sistemas que guardam dados sensíveis ou dão acesso a operações importantes, sim. Passkeys resolvem de uma vez dois dos problemas mais explorados em ataques, a senha fraca ou reutilizada e o phishing, e costumam deixar o login mais rápido. O trabalho maior está menos na tecnologia e mais no desenho da recuperação de conta e na comunicação com os usuários.

## Referências

- FIDO Alliance. [Passkeys](https://fidoalliance.org/passkeys/). Acesso em 29 set. 2026.
- W3C. [Web Authentication: An API for accessing Public Key Credentials](https://www.w3.org/TR/webauthn/). Acesso em 29 set. 2026.
- NIST. [SP 800-63B-4, Digital Identity Guidelines: Authentication and Authenticator Management](https://pages.nist.gov/800-63-4/sp800-63b.html). Acesso em 29 set. 2026.
- CISA, MS-ISAC, NSA e FBI. [#StopRansomware Guide](https://www.cisa.gov/stopransomware/ransomware-guide). Acesso em 29 set. 2026.
