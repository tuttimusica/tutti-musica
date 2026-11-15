# Tutti — regras comerciais confirmadas e bloqueios (2026-11-15)

## Regras aprovadas pelo proprietário
- Ultra Trimestral: R$ 799,90, **pagamento único**, acesso por 3 meses, **sem renovação automática**.
- Ultra Semestral: R$ 1.649,90, **pagamento único**, acesso por 6 meses, **sem renovação automática**.
- **Ultra Mensal: R$ 299,90, cobrança recorrente mensal**. O usuário disse 'cobrado todos os meses no fim do contrato'; esclarecer antes do checkout se significa cobrança ao fim de cada mês ou no início de cada ciclo, e o que encerra o contrato. O preço Stripe de testes atual é R$ 49,90 recurring, DIVERGENTE.
- **Pro Mensal (nome solicitado): R$ 19,90, pagamento único e acesso vitalício**. O nome 'mensal' contradiz o acesso vitalício: exibir claramente 'pagamento único / acesso vitalício' e confirmar nome comercial antes de publicar.
- Compras de conjuntos de partituras são separadas dos planos Ultra; não reutilizar seus preços nem seu webhook sem modelagem adequada.
- Somente ambiente de testes. Não alterar produção, não ativar pagamentos reais, não gerar custos, não fazer deploy principal.

## Achados da verificação read-only
- Stripe tem duas contas de testes: 'Área restrita de Tutti Musica' contém 3 produtos e preços; 'Tutti Musica' não contém produtos/preços.
- Preço de testes atual do Ultra Trimestral: R$ 799,00 (DIVERGENTE). Ultra Trimestral e Semestral são recurring mas deveriam ser one_time. Ultra Mensal é recurring corretamente quanto à periodicidade, mas o valor atual é R$ 49,90 e deveria ser R$ 299,90. O Pro Vitalício ainda não existe no Stripe.
- **Não editar preços Stripe existentes**: criar novos preços em conta de testes, após confirmação fiscal e autorização específica: Pro one_time 1990 centavos; Ultra Mensal recurring mensal 29990; Ultra Trimestral one_time 79990; Ultra Semestral one_time 164990. Arquivar preços antigos somente após migração e validação.
- Frontend em src/components/Panels/DeveloperPanel.tsx calcula intervalo='month' para planos trimestral/semestral; precisa separar duração de acesso e periodicidade de cobrança. Não corrigir apenas rótulos.
- Checkout de conjuntos em api/stripe/create-sheet-checkout.js já usa mode='payment'; não implementa planos Ultra.
- Webhook de partituras api/stripe/sheets-webhook.js só trata metadata.tipo='conjunto_partituras'; não libera assinaturas Ultra.
- Vercel sem STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET ou credenciais de preview isoladas; não copiar credenciais de produção para preview.
- Resend conectado, mas sem domínio verificado e sem API keys. Verificar também o Supabase Auth SMTP.
- Supabase sem tabelas de conjuntos/acessos e com política Storage a corrigir. Sem staging e sem backup, NÃO aplicar migração à produção.

## Plano de implementação em staging
1. Usar provisoriamente a conta de testes 'Área restrita de Tutti Musica' para avaliação (sem promover à produção); confirmar datas de cobrança Ultra Mensal, término/cancelamento, condições do Pro Vitalício e questões fiscais. O mensal Ultra é recorrente; os demais são pagamento único.
2. Criar ambiente de testes isolado sem custo, separado do banco real, antes de testar contas, uploads, cobranças ou webhooks.
3. Revisar schema de planos, assinaturas e entitlements; migrar apenas o necessário no staging. Vincular Stripe price IDs de teste aos quatro planos; separar periodicidade de cobrança de prazo de acesso e registrar vitaliciedade do Pro.
4. Implementar checkout autenticado com mode='subscription' apenas para Ultra Mensal (R$ 299,90/mês), após esclarecer o momento da primeira cobrança; mode='payment' para Pro Vitalício (R$ 19,90), Ultra Trimestral (R$ 799,90) e Ultra Semestral (R$ 1.649,90). Nunca criar subscription automática para os três últimos.
5. Implementar webhook idempotente com verificação de assinatura, pagamento e eventos de renovação, falha e cancelamento Ultra Mensal; calcular expiração no servidor para Ultra Trimestral/Semestral; acesso vitalício Pro, sujeito a regras de reembolso/estorno. Testar falhas e reenvios.
6. Configurar domínio Resend e chaves somente nos ambientes adequados, testar e-mails sem enviar mensagens reais sem autorização.
7. Testar matrícula, verificação de e-mail, aprovação de professor, pagamento teste, concessão/expiração de acesso e PDFs gratuitos/pagos com perfis distintos.
8. Stripe Tax NÃO foi ativado: é opcional e pode gerar tarifas; confirmar tratamento tributário com contador e opção de preço inclusivo/exclusivo antes de criar preços. Exigir revisão final e autorização específica antes de qualquer merge, alteração de produção ou publicação.

## Critério de bloqueio
Build READY e testes unitários não demonstram prontidão de produção. Não publicar checkout Ultra ou PDFs pagos antes de passar por testes integrados e revisão das políticas de acesso.
