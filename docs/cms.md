# CMS da Rocket Vision

CMS próprio, integrado ao site em Next.js. Edita a landing, os projetos do portfólio, a biblioteca de mídia, os usuários e as configurações do site. Tudo com rascunho, pré-visualização e publicação.

Endereço: `/cms` (fora dos buscadores, sem cache compartilhado).

## Como o conteúdo chega ao site

- **Landing e configurações**: cada seção tem um rascunho e uma versão publicada (tabela `content_sections`). O site lê só a publicada. Salvar não muda o site; publicar muda na hora.
- **Projetos**: o formulário edita a cópia de trabalho. Publicar congela essa cópia em `published_snapshot`, e o site lê só o snapshot. Despublicar e arquivar apagam o snapshot: a URL responde 404.
- **Pré-visualização**: o botão "Pré-visualizar" ativa o draft mode do Next e abre o site com os rascunhos. Só funciona com sessão válida e permissão; o cookie sozinho não mostra nada.
- **Cache**: as páginas públicas são estáticas, com cache por tag (`section:<chave>`, `projects`, `project:<slug>`, `media`). Cada publicação invalida só as tags afetadas.
- **Queda do banco**: o site público continua no ar com o conteúdo embutido no código (`src/lib/content/defaults.ts`).

## Primeira instalação (produção)

1. **Neon**: crie o projeto na região **AWS São Paulo (aws-sa-east-1)**, a única da América do Sul. Copie a connection string com pooling (`DATABASE_URL`) e a direta (`DATABASE_URL_UNPOOLED`).
2. **Vercel Blob**: crie um store e copie `BLOB_READ_WRITE_TOKEN`.
3. Cadastre as variáveis na Vercel (veja `.env.example`). Opcional: `RESEND_API_KEY` e `MAIL_FROM` para enviar convites por e-mail, e `CMS_URL` para o CMS ter endereço próprio (o domínio precisa estar ligado ao mesmo projeto da Vercel).
4. Com as variáveis no ambiente local (por exemplo `vercel env pull .env.local`):

   ```bash
   npm run db:migrate            # cria as tabelas (migrations em ./drizzle)
   npm run db:seed               # permissões, funções padrão e conteúdo atual do site já publicado
   npm run cms:bootstrap-owner -- --email pessoa@rocketvision.com.br --name "Nome Sobrenome"
   ```

   O último comando imprime um link de convite de uso único (7 dias). A pessoa abre o link e define a própria senha. **Nenhuma senha passa pela linha de comando nem fica no repositório.** O comando recusa rodar se já existir um owner ativo.

5. Opcional: `npm run db:seed-samples` migra os 6 projetos de exemplo que o site exibia (com selo "Projeto de exemplo", fora do sitemap e com noindex). Rode antes do deploy ou faça um redeploy depois, para o cache do site pegar os projetos.

Todos os scripts são idempotentes.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local        # preencha DATABASE_URL com um Postgres local ou um branch do Neon
npm run db:migrate && npm run db:seed
npm run cms:bootstrap-owner -- --email voce@exemplo.com --name "Seu Nome"
npm run dev
```

Sem `BLOB_READ_WRITE_TOKEN`, os uploads vão para `public/uploads` (ignorado pelo Git). Sem Resend, os e-mails aparecem no log do servidor.

Mudou o schema (`src/server/db/schema.ts`)? Gere a migration com `npm run db:generate -- --name descricao` e revise o SQL em `drizzle/` antes de aplicar.

## Testes

```bash
npm run lint
npm run typecheck
npm test              # unitários e integração (banco DATABASE_URL_TEST, nome terminado em _test)
npm run test:e2e      # navegador, fluxo completo (banco DATABASE_URL_E2E, nome terminado em _e2e)
```

Os bancos de teste são recriados a cada execução com as migrations reais. As proteções de nome impedem rodar os testes contra o banco de desenvolvimento ou de produção.

## Permissões

A autorização é sempre por permissão, verificada no servidor em cada página e rota de API. Funções são conjuntos de permissões editáveis em Usuários > Funções e permissões.

| Função | Resumo |
| --- | --- |
| Owner (sistema) | Tudo, inclusive gerenciar outros owners. Sempre existe ao menos um ativo. |
| Administrador | Tudo, menos mexer em owners. |
| Editor | Edita e publica landing e projetos, envia e edita mídia, vê as configurações. |
| Colaborador | Cria e edita rascunhos. Não publica. |

Regras que valem para todos: ninguém desativa a si mesmo, troca a própria função ou concede permissões que não tem.

## Segurança (resumo)

- Senhas com Argon2id (parâmetros OWASP). Sessões no banco, só o hash do token; cookie `__Host-` HttpOnly, Secure e SameSite=Lax em produção.
- Mutações só da mesma origem (CSRF), corpo JSON validado com Zod e limitado em tamanho; campos fora do schema são descartados.
- Rate limit no Postgres (compartilhado entre instâncias): login, redefinição de senha, uploads, mutações e formulário de contato. Excedeu: HTTP 429 com Retry-After.
- Uploads: tipo detectado pelos bytes, SVG recusado, imagem reprocessada (sem EXIF), limite de 10 MB e 50 megapixels.
- Auditoria de todas as ações, com antes e depois dos campos alterados e sem dados sensíveis.
- Cabeçalhos: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy e Permissions-Policy.
