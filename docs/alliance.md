# Rocket Alliance

**Rocket Alliance · The Rocket Vision Partner Program.** Grow Together. Go Beyond.

O programa de parceiros faz parte do site e do CMS que já existem. Não é um produto separado nem um segundo CMS. Ele reaproveita o banco, a mídia, a auditoria, o rate limit, o draft mode e os padrões de rota do Studio.

| Superfície | Endereço | Quem acessa |
| --- | --- | --- |
| Página pública | `/partners` | Qualquer pessoa (indexada) |
| Página de cada parceiro | `/partners/[slug]` | Qualquer pessoa, só depois de publicada |
| Gestão no Studio | `/cms/alliance` | Equipe Rocket Vision, conforme as permissões `alliance.*` |
| Alliance Hub | `/alliance` | Pessoas das empresas parceiras (login próprio, fora dos buscadores) |

## Como as partes se ligam

1. **Candidatura.** O formulário em `/partners` grava a candidatura com status *Pending Review*. Nesse momento não existe parceiro, página nem acesso.
2. **Aprovação.** No Studio, em Candidaturas, a candidatura aprovada gera o parceiro em *onboarding*, as modalidades e uma página em blocos (não publicada). A pessoa entra no Hub por convite, enviado em Parceiros → Equipe.
3. **Publicação.** O Studio publica o perfil. O site lê só o snapshot publicado (`published_snapshot`). Dados internos (contato, contratos, finanças, anotações) nunca entram no snapshot.
4. **Indicações.** O parceiro registra a indicação no Hub. A Rocket acompanha em Indicações (qualificação, negociação, ganha/perdida).
5. **Comissões.** Quando a indicação é ganha, a Rocket registra o que *efetivamente recebeu* do cliente. O servidor calcula a comissão pela regra aprovada e vigente. Depois vêm a aprovação da comissão e o registro do pagamento.

## Primeira instalação

Nada disto foi executado em produção. Siga a ordem abaixo quando houver autorização.

1. **Snapshot do Neon.** Crie um branch ou snapshot da branch de produção antes de migrar.
2. **Variáveis na Vercel** (Production e Preview):
   - `ALLIANCE_ENCRYPTION_KEY`: 32 caracteres ou mais, aleatórios (`openssl rand -base64 48`). Ela cifra os segredos de 2FA do Hub. **Não troque depois de ativar:** quem já usa 2FA teria de configurar de novo. Sem ela, o Hub funciona, mas a opção de 2FA fica indisponível.
   - `BLOB_READ_WRITE_TOKEN`: o mesmo já usado. Contratos e materiais vão para o Blob com `access: "private"`. Sem Blob em produção, o envio de arquivos responde 503.
   - `ALLIANCE_URL` (opcional): endereço próprio do Hub (ex.: `https://alliance.rocketvision.dev`). Com ela, `/alliance` só abre nesse endereço (o site redireciona para lá), a raiz dele leva ao Hub e os links dos e-mails do programa apontam para ele.
   - `ALLIANCE_MAIL_FROM` (opcional): remetente dos e-mails do programa (ex.: `Rocket Alliance <alliance@rocketvision.dev>`). Sem ela, usa `MAIL_FROM`.
   - `RESEND_API_KEY` e `MAIL_FROM` (já existentes) para os e-mails do programa. Sem eles, os e-mails ficam registrados como "não enviado" em Comunicações → E-mails enviados, e podem ser reenviados depois.
3. **Migração e seed:**

   ```bash
   npm run db:migrate   # aplica drizzle/0005_alliance.sql
   npm run db:seed      # garante as permissões da função "Gestor do Alliance"
   ```

   A migração cria as tabelas, as sequências dos códigos (`RA-000001`, `SUP-000001`), as modalidades e os níveis com os textos oficiais, os parâmetros do programa, as permissões e a função `alliance_manager`. Ela também cria **3 regras de comissão em rascunho** (Member 5%, Pro 8%, Elite 10%). **Nenhuma calcula comissão antes da aprovação comercial** em Comissões → Regras.
4. **Deploy.**
5. **No Studio:**
   - em Configurações → Rocket Alliance, preencha o e-mail de avisos da equipe;
   - aprove (ou ajuste) as regras de comissão;
   - revise os textos da página em Páginas → Página do programa e publique.

### Reverter

```bash
psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -1 -f drizzle/rollback/0005_alliance.down.sql
```

O rollback apaga **todos** os dados do programa, e só eles. Usuários, projetos, mídia, auditoria e o restante do conteúdo ficam intactos. Ele também remove o registro da migração, então `db:migrate` volta a aplicá-la. O ciclo sobe → desce → sobe foi testado num banco local.

## Permissões no Studio

As permissões do programa são separadas das do site:

- `alliance.view` dá acesso à área;
- cada aba sensível exige a própria permissão.

| Permissão | Libera |
| --- | --- |
| `alliance.view` | Ver a área, parceiros e indicações |
| `alliance.applications` | Aprovar, recusar e pedir informações em candidaturas |
| `alliance.partners` | Editar parceiros, nível, equipe do Hub |
| `alliance.publish` | Publicar perfis, páginas, diretório e a página do programa |
| `alliance.referrals` | Gerenciar indicações (etapas, responsável, reatribuição) |
| `alliance.resources` | Materiais e oportunidades |
| `alliance.communications` | Comunicados, suporte e registro de e-mails |
| `alliance.finance` | Regras, recebimentos, lançamentos e pagamentos |
| `alliance.contracts` | Contratos e termos |
| `alliance.settings` | Parâmetros, modalidades, níveis e auditoria do programa |

- **Owner:** tem todas.
- **Administrador:** tem todas, **menos** finanças, contratos e configurações.
- **Editor:** não tem nenhuma.
- **Gestor do Alliance** (`alliance_manager`), função nova: todo o programa, mais a mídia necessária para logos e páginas. Não edita o site.

Cada página e cada rota conferem a permissão no servidor. A aba escondida é só conveniência.

## Alliance Hub

- **Sessão própria.** Tabelas `partner_users`, `partner_sessions` e `partner_user_tokens`, e cookie `__Host-rv_partner`. Uma sessão do CMS não vale no Hub, nem o contrário.
- **2FA opcional por TOTP.** Aplicativo autenticador mais 10 códigos de recuperação, guardados só como hash.
- **Papéis na empresa:**

  | Papel | O que pode |
  | --- | --- |
  | Partner Owner | Tudo, inclusive equipe, contratos e ganhos |
  | Partner Manager | Indicações, oportunidades, dados da empresa e ganhos |
  | Partner Member | Só as próprias indicações, materiais e suporte |

- **Isolamento.** Toda consulta do Hub filtra pela empresa da sessão, no servidor. O ID na URL nunca basta: indicação, contrato, arquivo ou chamado de outra empresa responde 404.
- **Perfil público.** Mudanças em dados que aparecem no site viram um *pedido de alteração*, que a Rocket aprova em Parceiros. O contato interno a empresa atualiza sozinha.
- **Suspensão.** Suspender ou encerrar um parceiro tira o perfil do ar e derruba as sessões do Hub.

## Indicações

- **Proteção.** A empresa indicada fica reservada para quem registrou primeiro, por `protectionDays` (padrão 90, configurável).
- **Duplicidade.** A comparação usa domínio (ignorando e-mails gratuitos), CNPJ (com dígito verificador) e nome normalizado.
  - Mesmo domínio ou CNPJ protegido: a indicação é recusada com uma mensagem genérica. **O parceiro nunca descobre quem indicou antes.**
  - Só o nome igual: a indicação entra marcada como *possível duplicidade*, para a equipe decidir.
- **Envios simultâneos.** Um lock de transação (`pg_advisory_xact_lock`) garante que só um fica com a proteção.
- **Etapas.** Seguem um fluxo fechado. Perda exige motivo. Mensagens podem ser visíveis ao parceiro ou internas.
- **Reatribuição.** É auditada, com justificativa, e fica bloqueada depois de haver recebimentos.

## Comissões e pagamentos

- **Nenhum percentual no código.** Os percentuais vêm de `commission_rules`, com vigência, escopo (projeto, recorrente ou ambos) e número de mensalidades comissionadas. Vale a regra mais específica: parceiro, depois nível mais modalidade, depois nível, depois geral. Regra aprovada não muda: para alterar, arquive e crie outra.
- **Base de cálculo.** É só o que a Rocket registra como recebido. Nunca um valor informado pelo parceiro, nem calculado no navegador.
- **Dinheiro.** Tudo em centavos (`bigint`). Taxas em pontos-base, com arredondamento *half-up* em BigInt.
- **Sem pagamento em dobro:**
  - um lançamento por recebimento (índice único);
  - cada lançamento entra em um único pagamento;
  - o pagamento trava os lançamentos (`FOR UPDATE`), confere o total da tela com o do servidor e usa chave de idempotência (clique duplo devolve o mesmo pagamento).
- **Reembolso.** Gera estorno negativo com a mesma taxa da comissão original, limitado ao valor recebido.
- **Correções.** Ajuste manual exige motivo. Pagamento registrado por engano pode ser anulado, e os lançamentos voltam para "aprovada".
- **Histórico.** Nada é apagado. Tudo aparece na auditoria do programa.
- **No Hub.** O parceiro vê previstas (rotulado como estimativa), pendentes, aprovadas e pagas.

## Contratos e arquivos

- **Rascunho.** O contrato é criado em rascunho e depois enviado para aceite.
- **Envio.** Enviar congela o texto e grava o SHA-256 dele.
- **Aceite.** Feito pelo Partner Owner no Hub. Registra pessoa, data, IP, navegador e o hash do texto aceito. O servidor confere que o texto não mudou.
- **Nova versão.** Mudar o texto cria outra versão; a anterior continua no histórico.
- **Arquivos.** Contratos e materiais são privados (Vercel Blob `private`; em desenvolvimento, `.data/alliance-files`). Só são baixados por rotas que conferem a sessão e a permissão. O tipo é detectado pelos bytes, e HTML ou executáveis são recusados.

## Desenvolvimento

```bash
createdb rv_alliance
DATABASE_URL=postgres://…/rv_alliance npm run db:migrate && npm run db:seed
npm run dev
```

Para entrar no Hub localmente, convide uma pessoa em Parceiros → (parceiro) → Equipe. Sem Resend, o link de convite aparece na tela.

## Testes

- `tests/integration/alliance.test.ts` cobre candidatura, permissões do CMS, publicação, suspensão, autenticação e 2FA do Hub, papéis, duplicidade e concorrência de indicações, isolamento entre empresas, cálculo de comissão, recorrência, reembolso, idempotência e concorrência de pagamentos, anulação e downloads privados.
- `tests/integration/blog-routes.test.ts` confere que toda permissão usada nas rotas existe no catálogo, incluindo o do Hub.

```bash
DATABASE_URL_TEST=postgres://…/rv_test npm test
```

## Limitações conhecidas

- O pagamento é **registrado**, não executado: o Pix ou a transferência acontecem fora do sistema.
- A assinatura é um aceite eletrônico simples (registro de pessoa, data, IP e hash). Para assinatura com certificado, anexe o PDF assinado ao contrato.
- A mudança de nível é manual, feita pela equipe. Os critérios aparecem no site e no Hub como referência.
- O estado de "lido" das notificações é por pessoa. Comunicados usam o público definido no momento da publicação.
- Os textos oficiais do programa foram mantidos como entregues, inclusive a frase do conceito no futuro ("O programa terá identidade premium…"). Todos são editáveis em Páginas → Página do programa.
