<p align="center">
  <img width="800" alt="Brazilians in Clubhouse Logo" src="https://i.imgur.com/P5ytDNY.png">
</p>
<br>

Hello and welcome to the GitHub repository for Rocket Vision website! This houses all of the content at <a href="https://beta.rocketvision.com.br">beta.rocketvision.com.br</a>. The site is under construction


# Development team
- [Guilherme Ramos](https://github.com/guiramosrocket)
- [Lord](https://github.com/lewdum)


************************************************************************************************************************************************************
Olá Seja Bem-Vindo ao repositório do site da Rocket Vision esse repositório abriga todo o conteúdo em <a href="https://beta.rocketvision.com.br">beta.rocketvision.com.br</a>. O Site está em construção.


# Equipe de Desenvolvimento
- [Guilherme Ramos](https://github.com/guiramosrocket)
- [Lord](https://github.com/lewdum)

# Landing page (Next.js)

A landing page fica em `src/` e roda com Next.js.

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build && npm start
```

- Copy da página: `src/content/landing.ts`
- Dados da empresa (domínio, contato, redes, CNPJ): `src/lib/site.ts`
- Itens marcados com `CONFIRMAR` dependem de informação real da Rocket Vision.
- Formulário de contato: defina `CONTACT_WEBHOOK_URL` (veja `.env.example`).
