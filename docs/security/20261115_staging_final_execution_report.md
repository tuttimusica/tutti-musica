# Tutti Escola de Música — execução em staging e decisão de lançamento (15/11/2026)

## Escopo de segurança
Branch GitHub `audit/backend-auth-safe-fixes-20261114`, PR #1 em aberto. Projeto isolado Supabase `vscuqfoyrycfzthexvjy`. Produção Supabase `viwxalwpvuvgcyxsdjbi` NÃO alterada. Nenhum merge, publicação em produção, cobrança real ou usuário real de teste.

## Evidências confirmadas
- Vercel Preview no commit `edf19fcd9b2495140d4628c6205766fbfc6b1983`: `READY`, URL `https://tutti-musica-dwod92c32-tutti8.vercel.app`.
- Fetch autenticado da Preview: GET `/` = 200, GET `/api/health` = 200 com `{"service":"tutti-api","status":"ok"}`.
- Fetched `/assets/index-WKsriCQ0.js`: bundle contém ID staging `vscuqfoyrycfzthexvjy` e NÃO contém ID production `viwxalwpvuvgcyxsdjbi`.
- GitHub Actions `Tutti API security checks` run #189, commit `edf19fcd...`, `completed/success`: https://github.com/tuttimusica/tutti-musica/actions/runs/43757345177
- Supabase staging: 16 tabelas públicas/privadas essenciais incluindo `planos`, `usuarios`, `solicitacoes_professores`, `partituras`, `compositores`, `conjuntos_*`, `marcacoes_aulas`, `pagamentos` e grants privados. RLS habilitado em todas. Quatro planos com valores corretos. Bucket privado `tutti-partituras` (10 MB, application/pdf).
- Testes SQL: anon lê catálogo público vazio e diretório público vazio; anon não pode ler conjuntos adquiridos nem executar concessão de planos/cancelamento do professor; authenticated sem `auth.uid()` não pode cancelar agendamento. Grants/revogações são RPC SECURITY INVOKER executáveis somente por `service_role`.
- Advisor de segurança: 1 WARN (RPC pública `tutti_decidir_solicitacao_professor`, SECURITY DEFINER para authenticated com guarda interna) e 3 INFO (tabelas privadas intencionalmente sem policy).
- Preview: flag `TUTTI_PAYMENT_TEST_MODE=false`. Sem chaves de webhook e de Stripe test configuradas. Integração de Checkout mantém modo `payment` (único, renovação manual). Conta Stripe escolhida em modo teste; não foram processados pagamentos.
- Resend: lista de domínios retornou **No domains found**; falta domínio remetente verificado.
- Código da branch: sem fallback automático do Supabase para produção, URLs diagnósticas OAuth baseadas no projeto atual, conexão real no painel, diretório curado de professores, agendamento RPC com 60 minutos e Ultra pago, sem link Meet fictício; catálogo de partituras suporta UUID e conjuntos.

## Limitações e bloqueios impeditivos (não alegar E2E)
1. Supabase Auth: faltam testes reais de cadastro/confirmação, login Google, senha e aprovação de professor com contas fictícias; checar Auth redirect URLs e política SMTP.
2. Stripe: faltam chave de teste e webhook test assinados e testes E2E de Checkout, concessão, renovação, reembolso, disputas e concorrência. Não ativar compras ou cobranças até validar.
3. Partituras: storage e tabelas criados mas estão vazios; upload real de PDF, classificação gratuito/pago, grants e links assinados não testados com usuários fictícios.
4. Aulas: RPC e RLS criados, mas não há professores/alunos/grants reais no staging; agendamento positivo não testado; integração que provisiona evento real no Google Meet ainda não implementada.
5. Resend não possui domínio verificado, então confirmação/boas-vindas não estão validadas.
6. Produção: esquema existente é diferente, requer migrações revisadas, backup validado, testes de regressão, revisão LGPD e decisão de cutover. Não copiar scripts de staging diretamente para produção.
7. `tutti_decidir_solicitacao_professor` SECURITY DEFINER autenticada precisa revisão de menor privilégio antes do lançamento; aviso do advisor ainda presente.
8. Testes de navegador com usuários reais fictícios, proteção contra acessos indevidos, desempenho e responsividade não concluídos.

## Decisão
**Preview técnica ONLINE; produção comercial NÃO APROVADA**. O estado `READY` da Vercel e testes API não substituem testes ponta-a-ponta. Não fazer merge, ativar Stripe, abrir vendas nem alterar dados de produção.

## Próximos gates para liberação comercial
- Verificar remetente e SMTP/auth callbacks.
- Criar usuários fictícios e testar cadastro de aluno/professor + decisão de admin.
- Provisionar segredos de Stripe `sk_test_` e webhooks somente em Preview isolada e testar cada tipo de evento, incluindo cancelamento/reembolso.
- Validar PDF de teste gratuito e pago com compra de conjunto, direitos e download seguro.
- Validar professor/aluno 60 min, agendamento/recusa de conflito, e Meet real.
- Executar matriz completa de segurança, preparar rollback e backup de produção; somente após aprovação deliberada, preparar release.
