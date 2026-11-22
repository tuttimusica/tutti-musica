# Tutti Pro Vitalício — validação controlada de ponta a ponta

**Status:** preparação; **não** autoriza cobranças reais.
**Produto live:** R$ 19,90, pagamento único, `price_1UdKia0U9nB6Q0cfUj7V4993`.
**Stripe live:** `acct_1UZuju0U9nB6Q0cf`. Exigir `charges_enabled=true` para produção.
**Supabase produção:** `viwxalwpvuvgcyxsdjbi`.

## Regras
- Nunca utilizar chave `rk_live_` em Preview, nem chave de Supabase de produção no ambiente de teste.
- Nunca expor `sb_secret_` ou `service_role` no navegador/GitHub.
- Não liberar checkout live durante `requirements.pending_verification`.
- Validar licenças e direitos de distribuição de cada PDF, inclusive obras de terceiros.
- Pagamento testado só fica aprovado quando o webhook gerar acesso Pro no banco.

## Pré-requisitos em Vercel Preview
- `STRIPE_SECRET_KEY` = chave **de teste** da mesma conta do produto de teste (atualmente ausente).
- `STRIPE_PLANS_WEBHOOK_SECRET` = assinatura `whsec_` do webhook de **teste**.
- `TUTTI_PRO_SUPABASE_SERVICE_ROLE_KEY` = chave de serviço do projeto **staging** (atualmente ausente).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` = mesmo projeto staging.
- `TUTTI_TEST_ORIGIN` = URL HTTPS do Preview correto.
- `TUTTI_PAYMENT_TEST_MODE=true` somente em Preview quando as credenciais estiverem validadas.
- `VITE_TUTTI_PAYMENTS_ENABLED=true` somente em Preview quando o teste estiver pronto.
- Conferir que o preço `stripe_test_price_id` corresponde à conta da chave de teste e ao produto de teste esperado pelo backend.
- Ter pelo menos um PDF gratuito e um exclusivo publicado em staging; duas contas de aluno **verificadas** sem privilégios administrativos.

## Cenários
1. Deslogado: catálogo público e PDF gratuito abrem; URL de PDF exclusivo exige login/nega.
2. Aluno gratuito: acesso a PDF gratuito permitido; exclusivo bloqueado (sem URL assinada).
3. Checkout Pro: preço exato BRL 19,90, quantidade 1, modo `payment` (sem recorrência); dados do usuário extraídos do JWT verificado.
4. Pagamento de teste bem-sucedido: evento `checkout.session.completed`; webhook responde 2xx; `pagamentos` e `assinaturas_usuarios` registram uma concessão correta; aluno passa a abrir exclusivos atuais.
5. Reentrega de webhook: não deve duplicar pagamento/assinatura nem estender acesso.
6. Nova partitura exclusiva publicada depois da compra: Pro existente passa a ter acesso automaticamente, sem compra adicional.
7. Compra cancelada/recusada: nenhuma assinatura nova; usuário gratuito continua bloqueado.
8. Reembolso total/disputa: evento específico revoga o acesso Pro correspondente; compras anteriores legítimas não relacionadas preservadas.
9. URLs assinadas: emissão sob JWT do usuário, expiração curta, compartilhamento não altera permissões permanentes.
10. Monitorar resposta do endpoint `/api/partituras/signed-url`, eventos webhook e erros de Vercel/Supabase; registrar evidência de HTTP e banco para cada cenário.

## Portão de produção
Só habilitar `TUTTI_PRO_LIVE_CHECKOUT_ENABLED` e `VITE_TUTTI_PAYMENTS_ENABLED` depois de:
- `charges_enabled=true` na conta live correta, sem verificação cadastral bloqueadora;
- confirmação da titularidade, licença/autorizações do catálogo e políticas públicas;
- cenários de teste aprovados com evidência;
- verificação da chave Stripe restrita e webhook na conta correta;
- testes finais com comprador real autorizado e monitoramento de entregas/estornos.

Os ensaios SQL de RLS e concessão de plano **não substituem** pagamento/checkout e abertura real de PDF num navegador.
