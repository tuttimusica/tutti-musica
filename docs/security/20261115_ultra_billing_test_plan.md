# Tutti — regras comerciais confirmadas e bloqueios (2026-11-15)

## Regras aprovadas pelo proprietário
- Ultra Trimestral: R$ 799,90, **pagamento único**, acesso por 3 meses, **sem renovação automática**.
- Ultra Semestral: R$ 1.649,90, **pagamento único**, acesso por 6 meses, **sem renovação automática**.
- **Ultra Mensal: R$ 299,90, pagamento antecipado e renovação MANUAL opcional**. O aluno paga primeiro, recebe acesso às aulas com professores após confirmação do pagamento, e ao fim de cada mês decide se quer comprar outro período. **Não criar assinatura recorrente nem cobrança automática.** O preço Stripe de testes atual é R$ 49,90 recurring, DIVERGENTE.
- **Pro Mensal (nome solicitado): R$ 19,90, pagamento único e acesso vitalício**. O nome 'mensal' contradiz o acesso vitalício: exibir claramente 'pagamento único / acesso vitalício' e confirmar nome comercial antes de publicar.
- Compras de conjuntos de partituras são separadas dos planos Ultra; não reutilizar seus preços nem seu webhook sem modelagem adequada.
- Somente ambiente de testes. Não alterar produção, não ativar pagamentos reais, não gerar custos, não fazer deploy principal.

## Achados da verificação read-only
- Stripe tem duas contas de testes: 'Área restrita de Tutti Musica' contém 3 produtos e preços; 'Tutti Musica' não contém produtos/preços.
- Preço de testes atual do Ultra Trimestral: R$ 799,00 (DIVERGENTE). **Todos os preços atuais do Stripe são recurring, mas os quatro planos confirmados exigem checkout de pagamento único**, inclusive Ultra Mensal com renovação manual. O Ultra Mensal ainda custa R$ 49,90 em testes (deve ser R$ 299,90). O Pro Vitalício ainda não existe no Stripe.
- **Não editar preços Stripe existentes**: criar novos preços one_time em conta de testes, após autorização específica: Pro 1990 centavos; Ultra Mensal 29990; Ultra Trimestral 79990; Ultra Semestral 164990. Arquivar preços antigos somente após migração e validação.
- Frontend em src/components/Panels/DeveloperPanel.tsx calcula intervalo='month' para planos trimestral/semestral; precisa separar duração de acesso e periodicidade de cobrança. Não corrigir apenas rótulos.
- Checkout de conjuntos em api/stripe/create-sheet-checkout.js já usa mode='payment'; não implementa planos Ultra.
- Webhook de partituras api/stripe/sheets-webhook.js só trata metadata.tipo='conjunto_partituras'; não libera assinaturas Ultra.
- Vercel sem STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET ou credenciais de preview isoladas; não copiar credenciais de produção para preview.
- Resend conectado, mas sem domínio verificado e sem API keys. Verificar também o Supabase Auth SMTP.
- Supabase sem tabelas de conjuntos/acessos e com política Storage a corrigir. Sem staging e sem backup, NÃO aplicar migração à produção.

## Plano de implementação em staging
1. Usar provisoriamente a conta de testes 'Área restrita de Tutti Musica' para avaliação (sem promover à produção); pagamento Ultra Mensal antecipado, renovação manual ao término de cada período, sem cobrança automática. Confirmar regras de expiração, aulas já agendadas, estorno e condições do Pro Vitalício.
2. Criar ambiente de testes isolado sem custo, separado do banco real, antes de testar contas, uploads, cobranças ou webhooks.
3. Revisar schema de planos, assinaturas e entitlements; migrar apenas o necessário no staging. Vincular Stripe price IDs de teste aos quatro planos; separar periodicidade de cobrança de prazo de acesso e registrar vitaliciedade do Pro.
4. Implementar checkout autenticado com mode='payment' para **todos os quatro planos**: Pro Vitalício R$ 19,90; Ultra Mensal R$ 299,90 por período de 1 mês com renovação manual; Ultra Trimestral R$ 799,90; Ultra Semestral R$ 1.649,90. Nunca criar subscription automática para nenhum plano.
5. Implementar webhook idempotente com verificação de assinatura e pagamento, liberar agendamento/aulas com professores **somente após pagamento confirmado**. Calcular expiração no servidor para Ultra Mensal/Trimestral/Semestral; Ultra Mensal renovado apenas mediante nova compra manual. Acesso vitalício Pro sujeito a regras de reembolso/estorno. Testar falhas, reenvios, expiração e renovação.
6. Configurar domínio Resend e chaves somente nos ambientes adequados, testar e-mails sem enviar mensagens reais sem autorização.
7. Testar matrícula, verificação de e-mail, aprovação de professor, pagamento teste, concessão/expiração de acesso e PDFs gratuitos/pagos com perfis distintos.
8. Stripe Tax NÃO será ativado agora por decisão do proprietário; avaliar futuramente quando houver receitas. Isso não elimina obrigações fiscais. Exigir revisão final e autorização específica antes de qualquer merge, alteração de produção ou publicação.

## Critério de bloqueio
Build READY e testes unitários não demonstram prontidão de produção. Não publicar checkout Ultra ou PDFs pagos antes de passar por testes integrados e revisão das políticas de acesso.
