# Tutti — quatro integrações: execução e impedimentos verificados (2026-11-15)

## Escopo
Conta Stripe **Tutti Musica**, **test mode**; Resend conectado; Supabase staging `vscuqfoyrycfzthexvjy`; Vercel Preview da branch `audit/backend-auth-safe-fixes-20261114`. Produção e `main` preservadas; nenhuma cobrança real.

## 1. Resend — envio de confirmação e boas-vindas
- Resend `list_domains` retorna **No domains found**.
- Vercel `list_domains` retorna lista vazia. Projeto tem somente `tutti-musica.vercel.app`, domínio da plataforma, não propriedade do usuário para verificação de remetente.
- Criadas migração `tutti_staging_welcome_email_idempotency`, API `api/emails/welcome.js` e integração no `AuthContext`: após login com e-mail confirmado, solicita mensagem de boas-vindas; API valida JWT no servidor, usa claim atômico e `Idempotency-Key` do Resend.
- Teste SQL transacional de claim, segunda solicitação, confirmação do envio e bloqueio de duplicidade **PASSOU**. Não enviou e-mails reais.
- `TUTTI_WELCOME_EMAIL_ENABLED` permanece ausente/desativado e envio bloqueado até `RESEND_API_KEY`, `TUTTI_EMAIL_FROM` com domínio verificado e `SUPABASE_SERVICE_ROLE_KEY` de staging.
- **E-mail de confirmação** é responsabilidade do Supabase Auth SMTP (não da API de boas-vindas). Falta configuração SMTP, Auth Site URL e Redirect URLs de testes.

## 2. Stripe — dois webhooks de teste
Criados na conta `Tutti Musica`, modo de testes (**não** live):
- Planos: `we_1UcACk0U9nB6Q0cfxEXDYhwH`
  - `https://tutti-musica-git-audit-backend-auth-safe-fixes-20261114-tutti8.vercel.app/api/stripe/plans-webhook`
  - Webhook `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`.
- Conjuntos de partituras: `we_1UcACx0U9nB6Q0cff6YQ4aSL`
  - `https://tutti-musica-git-audit-backend-auth-safe-fixes-20261114-tutti8.vercel.app/api/stripe/sheets-webhook`
  - Mesmos eventos.
- Segredos de assinatura **salvos sem exibição** nas env vars criptografadas `STRIPE_PLANS_WEBHOOK_SECRET` e `STRIPE_WEBHOOK_SECRET`, somente na Preview da branch.
- **Não pronto para entrega de eventos:** Vercel Authentication está ativada com `deploymentType=all_except_custom_domains`, bloqueando Stripe POSTs sem bypass; não desabilitamos a proteção. O bypass automático tem escopo em todo o projeto e também pode afetar produção, portanto não criado silenciosamente. <https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection>
- Ausentes `STRIPE_SECRET_KEY` de teste e `SUPABASE_SERVICE_ROLE_KEY` de **staging** na Preview. `TUTTI_PAYMENT_TEST_MODE=false`; não cobrar até completar configuração e comprovar E2E.
- Sem criação de preços recorrentes; Checkout de planos usa `price_data` efêmero e modo `payment`.

## 3. Google Meet
- Nenhuma conexão de Google Calendar disponível às ferramentas nesta sessão. A conexão exige consentimento do dono; a sugestão de Google Calendar já foi enviada.
- Uma conexão de calendário individual pode permitir gerar eventos pontuais; **automação permanente do site** exige integração de backend/OAuth aprovada e vínculo de calendários. Não foram gerados Meet URLs falsos.

## 4. Testes e segurança
- Simulações transacionais Supabase (revertidas): professor pendente + aprovação, aluno não-admin proibido de aprovar, plano Ultra pago simulado, reembolso, repetição de IDs de eventos, impossibilidade de novo agendamento pós-reembolso, reserva futura de 60 min e conflito de horários, compra simulada de conjunto e RLS por proprietário.
- Serviço de boas-vindas: claim idempotente, marcação de envio, repetição bloqueada.
- Supabase Security Advisor: **0 WARN**, 4 INFO de RLS sem políticas em tabelas destinadas apenas a serviço/servidor. Não significa auditoria completa aprovada.
- GitHub Actions do commit `c5ab1bfdc0899e7267d84e6aaf58c7618589dd31`: run `43759514962`, conclusão `success`.
- Vercel Preview `https://tutti-musica-1wgvtj173-tutti8.vercel.app`, status READY; GET `/`=200; GET `/api/health`=200; bundle de frontend contém ID staging e não contém ID Supabase produção.
- **Não realizados:** confirmação real de e-mail, entrega real via Resend, Checkout de cartão de teste e webhook Stripe end-to-end, upload real de PDF e download assinado com usuários Auth reais, criação real do Google Meet. Proteção Preview impossibilita Stripe webhooks no estado atual.

## Ações externas necessárias sem compartilhar segredos no chat
1. Escolher domínio **de propriedade da Tutti** e gerenciar DNS. Criar domínio em Resend e configurar registros DKIM/SPF requer esse nome e autorização de DNS.
2. Adicionar via Vercel Dashboard env vars **exclusivas** da Preview branch: `STRIPE_SECRET_KEY=sk_test_...`, `SUPABASE_SERVICE_ROLE_KEY` do projeto staging, `RESEND_API_KEY`, `TUTTI_EMAIL_FROM` verificado; somente após validar, ativar flags de teste.
3. Resolver webhook protegido **sem remover segurança da produção** (rota pública dedicada/receiver separado com assinatura validada, ou bypass com gestão explícita de risco).
4. Conectar Google Calendar do organizador e autorizar APIs de criação de eventos com conferência.
5. Testar entregas reais e todos os fluxos completos; validar backups e plano de migração antes do lançamento.

## Decisão
**Preview técnica online, integrações externas não aprovadas. Não liberar produção comercial.**
