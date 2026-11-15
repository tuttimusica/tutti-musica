# Tutti — auditoria gratuita após recusa de compra de domínio

Data: 2026-11-15. Escopo autorizado: somente verificações e testes gratuitos. **Sem compra de domínio, sem ativar renovação, sem cobrança, sem enviar e-mails reais, sem promover alterações para produção.**

## Conferência do ambiente
- Preview em `https://tutti-musica-on0vhe3ze-tutti8.vercel.app` (commit `74e2f70b5bd7b28d002251ce6ffd9ee43d87abae`) `READY`. GET `/` e GET `/api/health` retornam HTTP 200.
- Supabase de testes `vscuqfoyrycfzthexvjy` separado da produção.
- Preview tem os segredos dos webhooks **Stripe Test** para planos e partituras. `TUTTI_PAYMENT_TEST_MODE` continua `false`. Chaves `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, remetente `TUTTI_EMAIL_FROM` e flag `TUTTI_WELCOME_EMAIL_ENABLED` não estão configurados na Preview.
- Banco de staging após testes: 0 usuários de Auth, solicitações de professores, pagamentos, assinaturas, partituras, marcações de aulas e envios de boas-vindas; testes SQL usaram transações `BEGIN ... ROLLBACK`.
- Security Advisor: nenhum WARN, quatro INFO de tabelas administrativas ou privadas sem policies para clientes, que é comportamento esperado.

## Novos testes executados, PASSARAM
1. Dados manipulados pelo cliente com `role=admin`, `is_admin=true`, `account_type=teacher` não geraram privilégio de administrador nem papel aprovado no perfil.
2. Um usuário autenticado comum não conseguiu inserir uma partitura pública; o RLS negou a escrita.
3. Simulação de concessão de plano mensal com valor errado (R$ 19,90 no lugar de R$ 299,90) foi rejeitada como `price_mismatch`; nenhum acesso indevido.
4. Concessão com preço correto (R$ 299,90) funcionou no banco sob service_role.
5. Reaproveitamento da mesma sessão de Checkout com outro plano e preço foi rejeitado como `session_conflict`.
6. Nenhum dado fictício persistiu após os testes.
7. A página de entrada e o endpoint de saúde da Preview respondem HTTP 200.

## Testes anteriores preservados (não reexecutados neste registro)
- Autenticação simulada, aprovação de professores, pagamento/reembolso idempotente, bloqueio de aulas após reembolso, aulas de 60 minutos, horários conflitantes, acesso pago/gratuito de partituras, controle de e-mail de boas-vindas. Consultar `20261115_integration_qa_verified.md` e `20261115_four_integrations_execution.md`.

## Bloqueios externos que não podem ser solucionados sem mudar escopo
- Resend requer um domínio *de propriedade do titular* (ou remetente de sandbox aceito) para verificar DNS. Não foi criado um domínio fictício ou comprado domínio.
- Checkout Stripe com cartão de teste exige chave `sk_test` inserida com segurança na Preview e chave privilegiada somente do Supabase staging. Preview está sob Vercel Authentication, impedindo Stripe POSTs públicos até configurar ingress dedicado/verificado; não se deve remover a proteção do site inteiro.
- Supabase SMTP / Auth callbacks precisam estar configurados, e as confirmações precisam de entrega real para testes de cadastro por e-mail.
- Google Meet depende de autorização de Google Calendar e backend OAuth; não se inventam links.
- Download real de PDFs depende de dados e arquivos de teste devidamente autorizados; metadados simulados não bastam para E2E.
- Comercialização **não liberada**: falta E2E e migrações de produção revisadas, backup e rollback.

## Recomendação
Preservar staging e Preview; não alterar produção. Após aquisição futura de domínio próprio e configuração de credenciais por painel, testar recebimento de e-mail, Stripe Checkout/webhooks assinados, PDF privado e links Meet válidos antes de ativar vendas.
