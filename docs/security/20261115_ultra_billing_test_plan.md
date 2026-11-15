# Tutti — regras comerciais confirmadas e bloqueios (2026-11-15)

## Regras aprovadas pelo proprietário
- Ultra Trimestral: R$ 799,90, **pagamento único**, acesso por 3 meses, **sem renovação automática**.
- Ultra Semestral: R$ 1.649,90, **pagamento único**, acesso por 6 meses, **sem renovação automática**.
- Ultra Mensal: R$ 49,90 na conta Stripe de testes; política de renovação do mensal ainda **não confirmada**.
- Compras de conjuntos de partituras são separadas dos planos Ultra; não reutilizar seus preços nem seu webhook sem modelagem adequada.
- Somente ambiente de testes. Não alterar produção, não ativar pagamentos reais, não gerar custos, não fazer deploy principal.

## Achados da verificação read-only
- Stripe tem duas contas de testes: 'Área restrita de Tutti Musica' contém 3 produtos e preços; 'Tutti Musica' não contém produtos/preços.
- Preço de testes atual do Ultra Trimestral: R$ 799,00 (DIVERGENTE). Preços trimestral e semestral atuais são recurring (intervalos 3 e 6 meses), DIVERGENTES da cobrança única.
- **Não editar preços Stripe existentes**: criar novos prices do tipo one_time exclusivamente na conta de testes correta, quando autorizado e identificada. Arquivar preços antigos somente após migração e validação.
- Frontend em src/components/Panels/DeveloperPanel.tsx calcula intervalo='month' para planos trimestral/semestral; precisa separar duração de acesso e periodicidade de cobrança. Não corrigir apenas rótulos.
- Checkout de conjuntos em api/stripe/create-sheet-checkout.js já usa mode='payment'; não implementa planos Ultra.
- Webhook de partituras api/stripe/sheets-webhook.js só trata metadata.tipo='conjunto_partituras'; não libera assinaturas Ultra.
- Vercel sem STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET ou credenciais de preview isoladas; não copiar credenciais de produção para preview.
- Resend conectado, mas sem domínio verificado e sem API keys. Verificar também o Supabase Auth SMTP.
- Supabase sem tabelas de conjuntos/acessos e com política Storage a corrigir. Sem staging e sem backup, NÃO aplicar migração à produção.

## Plano de implementação em staging
1. Definir qual conta Stripe usar, confirmar política do Ultra Mensal e regras de início/fim de vigência, reembolso e eventual extensão.
2. Criar ambiente de testes isolado sem custo, separado do banco real, antes de testar contas, uploads, cobranças ou webhooks.
3. Revisar schema de planos, assinaturas e entitlements; migrar apenas o necessário no staging. Vincular Stripe price IDs de teste aos planos e impor que trimestral/semestral sejam one_time.
4. Implementar endpoint de checkout autenticado com mode='payment' para Ultra trimestral/semestral; checkout mensal conforme política aprovada.
5. Implementar webhook idempotente de acesso com verificação de assinatura e status de pagamento; calcular expiração no servidor e testar falhas/reenvios.
6. Configurar domínio Resend e chaves somente nos ambientes adequados, testar e-mails sem enviar mensagens reais sem autorização.
7. Testar matrícula, verificação de e-mail, aprovação de professor, pagamento teste, concessão/expiração de acesso e PDFs gratuitos/pagos com perfis distintos.
8. Exigir revisão final e autorização específica antes de qualquer merge, alteração de produção ou publicação.

## Critério de bloqueio
Build READY e testes unitários não demonstram prontidão de produção. Não publicar checkout Ultra ou PDFs pagos antes de passar por testes integrados e revisão das políticas de acesso.
