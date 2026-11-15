# Tutti — verificações de integração: cadastro, pagamentos, partituras e aulas
Data: 2026-11-15

## Escopo e isolamento
Projeto de staging Supabase `vscuqfoyrycfzthexvjy`; branch `audit/backend-auth-safe-fixes-20261114` e Vercel Preview. Nenhuma mudança no Supabase de produção, nenhum merge no `main`, nenhuma cobrança e nenhum envio de e-mail real. Testes SQL usaram `BEGIN` / `ROLLBACK` com identidades fictícias reservadas em domínios inválidos. Após os testes: **0** usuários, solicitações de professores, assinaturas, pagamentos, partituras, direitos de conjuntos e agendamentos gravados.

## Correções instaladas e confirmadas
- `tutti_staging_teacher_approval_privilege_fix`: RPC pública `public.tutti_decidir_solicitacao_professor` agora é `SECURITY INVOKER`, chamando função privilegiada em schema privado. A checagem no servidor exige usuário autenticado e desenvolvedor autorizado.
- `tutti_staging_plan_grant_role_fix`: RPC `tutti_apply_paid_plan` passou a validar registro de usuário sem depender de SELECT de `auth.users` pelo papel `service_role`.
- `tutti_staging_plan_grant_idempotency_fix`: vários eventos legítimos da mesma sessão Stripe não duplicam assinatura.
- Adicionado `TUTTI_TEST_ORIGIN` somente à Preview da branch, usando alias verificado com HTTP 200: `https://tutti-musica-git-audit-backend-auth-safe-fixes-20261114-tutti8.vercel.app`. Pagamentos permanecem com `TUTTI_PAYMENT_TEST_MODE=false`.

## Testes SQL executados e aprovados (identidades simuladas, transações revertidas)
1. Cadastro de professor => solicitação pendente; papel inicial sem privilégios de professor; aprovação por usuário fictício autorizado => papel de professor aprovado; perfis sincronizados.
2. Usuário comum autenticado **não consegue** aprovar professor: `42501`, solicitação permanece pendente.
3. Plano mensal de teste => concessão válida, status ativo, reprocessamento idempotente, reembolso => revogação e status cancelado.
4. Dois IDs de evento Stripe diferentes para a **mesma sessão** => apenas uma assinatura; reprocessar após revogação não recria acesso.
5. Professor aprovado + aluno fictício com Ultra => reserva de 60 minutos em horário futuro; segunda reserva no mesmo horário => restrição de conflito bloqueia.
6. Após reembolso do Ultra => tentativa de novo agendamento pelo professor negada.
7. Compositor, duas partituras fictícias e conjunto: publicação visível; usuário estranho sem acesso; comprador com concessão simulada vê seu conjunto.
8. Bucket `tutti-partituras` privado. Advisor Supabase: somente três INFO de tabelas deliberadamente sem policies de leitura de cliente, **nenhuma WARN** após mover RPC privilegiada.
9. Na última Preview validada antes deste relatório, código compilava e GET `/` e `/api/health` retornaram HTTP 200; bundle JS continha referência ao projeto de testes e nenhuma referência ao ID do projeto de produção. GitHub Action run `43758746824` concluiu `success` no commit `f113e1e4b328938e3292b520461509835f97aaa7`.

## Bloqueios externos e funcionais — não são testes aprovados
- **Resend**: conta conectada devolveu *No domains found*. Não se pode verificar ou controlar `gmail.com`; falta um domínio de envio próprio com DNS válido. Envio de boas-vindas, confirmação e entrega de e-mail não foram exercitados.
- **Stripe**: conta selecionada `Tutti Musica` está em modo de testes. Vercel Preview ainda não tem chaves `sk_test_`, segredos de webhooks ou serviço de concessão configurados; `TUTTI_PAYMENT_TEST_MODE=false`. Os testes acima foram SQL simulados, **não** eventos de Checkout assinados pela Stripe. Checkout utiliza preço dinâmico embutido, então não exige cadastrar produtos previamente.
- **Supabase Auth**: não foi executado teste via UI completo com autenticação real, confirmação de e-mail, recuperação de senha e Google OAuth. Teste de trigger SQL não substitui envio/recebimento.
- **PDFs**: metadados e permissões foram simulados, sem upload de arquivo PDF real nem URL assinada produzida e baixada. Bucket vazio após teste.
- **Google Meet**: não existe acesso conectado à conta Google Calendar do organizador; nenhum evento ou Meet real criado. Foi sugerida conexão à integração Google Calendar, que exige ação explícita do titular.
- **Lançamento**: falta QA real de browser, fluxo Stripe + Supabase, LGPD, backup, migrações específicas da produção e liberação manual aprovada.

## Decisão de release
**Preview técnica disponível; produção comercial NÃO APROVADA.** Não ligar pagamentos reais, não promover Preview, não fazer merge nem executar staging SQL na base de produção. Faltam pré-requisitos externos e testes de ponta a ponta com serviços conectados.

## Ações do titular que continuam indispensáveis
1. Informar/verificar DNS do domínio remetente sob seu controle no Resend.
2. Instalar `STRIPE_SECRET_KEY` de teste, segredos dos webhooks e chave de serviço do Supabase de testes apenas no ambiente Preview; segredos nunca no código ou chat.
3. Conectar Google Calendar do organizador para criar reuniões Meet verdadeiras.
4. Verificar URLs de callback/autenticação do Supabase de testes e configurar SMTP, para permitir testes de login/confirmacão.
