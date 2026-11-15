# Tutti — implantação segura do módulo de partituras (pendente)

Branch: audit/backend-auth-safe-fixes-20261114
Data: 2026-11-14

## Já implementado na branch
- IDs UUID preservados no serviço, painel do aluno e componentes compartilhados (exemplos estáticos ainda podem usar IDs numéricos).
- Uploads no bucket privado existente tutti-partituras.
- CRUD do painel do desenvolvedor alinhado a instrumento_id, nivel_dificuldade, estilo_musical, tamanho_bytes e enviado_por; confirmação de linhas afetadas.
- Migração SQL proposta em docs/security/20261114_partituras_migration_REVIEW_ONLY.sql (não aplicada).
- API serverless POST /api/partituras/signed-url com autorização de leitura gratuita, admin ou compra/conjunto.
- API serverless POST /api/stripe/create-sheet-checkout para conjuntos publicados; POST /api/stripe/sheets-webhook com verificação de assinatura e upsert de direito de acesso.
- Gestão básica de conjuntos (criar rascunho, selecionar itens, publicar/ocultar) no painel do desenvolvedor e compra no painel do aluno.
- Testes de rejeição de métodos/UUID inválido/autenticação nas APIs.

## BLOQUEIOS DE PUBLICAÇÃO
1. **SQL NÃO EXECUTADO:** sem colunas categoria/is_featured etc. e tabelas de conjuntos/acessos/compositores, upload e pagamentos não funcionam.
2. **Política de Storage em produção:** atualmente permite ler PDFs publicados sem checar compra. A migração revoga essa regra e cria leitura apenas para gratuitos/admin. Aplicar antes de publicar PDFs pagos.
3. **Variáveis de ambiente Vercel:** auditoria de nomes encontrou Supabase configurado para produção, mas nenhuma variável Stripe (STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET) e nenhuma variável de Supabase para preview. Não copiar credenciais de produção para previews públicos; configurar ambiente isolado quando disponível.
4. **Webhook Stripe:** cadastrar o endpoint /api/stripe/sheets-webhook no painel Stripe com evento checkout.session.completed e o signing secret. Usar modo teste antes de live. Nunca expor secret ao navegador.
5. **Sem staging Supabase:** branching exige Pro e o usuário não quer custos; não há projeto de teste separado autorizado. Não testar INSERT/UPDATE, uploads ou compras em banco de produção sem aprovação.
6. **Testes pendentes:** execução real de upload, edição, exclusão, categoria, publicação, compra teste Stripe, webhook assinado, revogação e leitura com dois usuários distintos. Não basta Vite build ou testes de métodos.
7. **Pagamento individual:** interface existente ainda contém caminho legado para compra de partitura individual; fluxo novo implementado é de **conjuntos**. Não habilitar preços individuais sem implementação específica.
8. **Admin e autenticação:** revisar previamente inconsistência das funções private.tutti_is_admin e private.is_admin, e garantir que desenvolvedor autenticado tem autorização correta. A nova migração usa private.tutti_is_admin para manter coerência com partituras.
9. **Limpeza de PDFs:** após exclusão do registro, se Storage falhar, arquivo órfão pode permanecer; painel agora avisa. Ideal adicionar reconciliação server-side antes de escala.
10. **Preview:** Vercel preview pode compilar sem ter Supabase ou Stripe conectados; não considerar isso teste integrado.

## Sequência para liberação
A. Revisão independente de SQL/RLS e backup.
B. Testar migração e políticas em ambiente de testes sem dados reais.
C. Configurar secrets em Vercel/Stripe pelo proprietário, sem compartilhá-los em chat.
D. Executar testes de ponta a ponta com contas/arquivos fictícios, incluindo usuário sem compra.
E. Revisar PR e autorizar merge/deploy produção, monitorar erros e reverter se necessário.

## Observação
Não foram feitas alterações de schema, dados, buckets ou segredos no Supabase de produção. Não houve merge para main ou promoção de deploy. Não foram contratados recursos pagos.
