# Tutti — integração de pagamentos: bloqueios antes da publicação

## Concluído na branch isolada
- `api/stripe/plan-policy.js`: catálogo fixo dos quatro planos, conferência de pagamento e cálculo de vigência, distinção Pro vitalício versus Ultra com aulas.
- `api/stripe/create-plan-checkout.js`: endpoint autenticado de checkout Stripe `mode=payment`, restrito a `TUTTI_PAYMENT_TEST_MODE=true`, `sk_test_`, `TUTTI_TEST_ORIGIN` HTTPS e fora de `VERCEL_ENV=production`.
- `tests/plan-policy.test.mjs`: cenários de pagamento não confirmado, moeda/valor divergente, Pro vitalício, renovação manual e vencimento.
- Textos de referência dos planos atualizados na branch de auditoria.

## Ainda NÃO integrado
1. Criar migration revisada para acesso aos planos com registro idempotente de pagamentos, expiração e revogação em ambiente Supabase **separado**.
2. Criar webhook Stripe para planos com assinatura verificada, conferência de valor/moeda, identificação da sessão e concessão transacional de direitos de acesso. Rejeitar/ignorar pagamento pendente e eventos duplicados; tratar estorno e chargeback.
3. Reforçar RLS/policies e endpoints de agendamento para consultar a vigência no servidor, e garantir que professores só vejam alunos com direito vigente. Não confiar em estado React ou metadata do cliente.
4. Conectar o frontend ao novo endpoint, desativando o fallback para checkout recorrente antigo; distinguir Pro digital de Ultra aulas.
5. Configurar Stripe de testes com preços one_time novos e webhook de teste, sem Stripe Tax; somente após configurar staging independente e autorizar operações de escrita em testes.
6. Testar casos de checkout cancelado, pago, duplicado, estornado, expirado, professor não aprovado, aluno não autorizado, renovação manual e PDFs protegidos.

## Observações de segurança
- A rota de checkout sozinha **não libera aulas**. Nenhum acesso pode ser concedido sem confirmação assinada do webhook e registro no banco.
- O Pro vitalício deve manter acesso aos recursos digitais Pro, não às aulas particulares Ultra.
- Não configurar credenciais de produção no preview. Não executar migrations no Supabase principal, não mesclar a PR, não publicar em produção sem aprovação.
- Nenhum teste de integração com pagamentos reais foi executado nesta etapa.
