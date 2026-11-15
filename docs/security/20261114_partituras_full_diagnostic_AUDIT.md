# Diagnóstico completo — módulo de partituras Tutti
Data: 2026-11-14. Branch: audit/backend-auth-safe-fixes-20261114. **Somente auditoria; nenhuma alteração no Supabase de produção.**

## Escopo e evidência
Código revisado: src/services/partiturasService.ts; src/components/Panels/DeveloperPanel.tsx; src/components/Panels/StudentPanel.tsx; src/components/SheetMusic/SheetViewerModal.tsx; src/data/musicData.ts; server.ts. Metadados de tabelas, buckets, objetos e políticas consultados no projeto Supabase viwxalwpvuvgcyxsdjbi por SELECT somente. Vercel e GitHub Actions validados no commit 8ef787e. Nenhum fluxo real de upload, checkout, compra ou download foi testado, pois não há ambiente de dados isolado.

## Achados prioritários

1. **CRÍTICO — Identificadores incompatíveis.** public.partituras.id é uuid; DbPartitura.id, SheetMusic.id, Set de acessos e funções de checkout usam number; normalizeDbPartitura aplica Number(row.id), StudentPanel aplica Number(item.id), server.ts converte partitura_id com Number(...) em signed-url, checkout e webhook. UUID vira NaN, inviabilizando consulta e acesso. Há ainda catálogo estático com IDs numéricos; migração requer estratégia para exemplos.
2. **CRÍTICO — Buckets divergentes.** Supabase tem apenas bucket privado tutti-partituras; frontend e Express referenciam partituras e partituras-pagas, inexistentes. Políticas de Storage existentes valem para tutti-partituras. O formulário tenta provisionamento via /api/admin/ensure-storage-buckets que não é rota disponível no Vercel na arquitetura atual.
3. **CRÍTICO — Possível exposição de PDFs pagos.** Política SELECT em storage.objects para tutti-partituras permite acesso a objetos vinculados a QUALQUER partitura publicada, sem checar categoria, compra ou assinatura. Antes de registrar PDFs pagos nesse bucket, alterar política e testar com usuários sem direito de acesso. Bucket privado não basta quando uma política SELECT concede acesso.
4. **ALTO — INSERT/UPDATE com colunas inexistentes.** Frontend envia instrumento, nivel, genero, tonalidade, tom_original, categoria, preco, arquivo_pdf_url, is_featured, featured_order, file_size_bytes, created_by, enquanto DB exige instrumento_id e storage_path. Falhas de persistência são esperadas.
5. **ALTO — Entitlements ausentes.** Tabelas partituras_acessos, conjuntos_partituras_itens, conjuntos_acessos, conjuntos_partituras e compositores não existem. UI de compras por conjuntos e seleção persistente de compositor não podem funcionar como descritas.
6. **ALTO — API de PDF e checkout não implantada.** Rotas /api/partituras/signed-url e /api/stripe/create-sheet-checkout estão no server.ts Express; não foram encontradas implementações serverless correspondentes em api/. Edge Function partitura-access também ausente na auditoria anterior. Portanto acesso PDF depende de backend não disponibilizado no Vercel.
7. **ALTO — Webhook Stripe não libera acesso.** server.ts converte UUID de metadata em Number, tenta upsert em partituras_acessos inexistente e não checa o erro do upsert; risco de evento considerado processado sem concessão efetiva. Requer processamento idempotente e tratamento de erro transacional.
8. **ALTO — Ação rápida de categoria não move PDF.** handleToggleSheetCategory atualiza somente coluna categoria (que nem existe), não move objeto para bucket correto. Mesmo com migração, pode deixar arquivo acessível no local anterior.
9. **MÉDIO/ALTO — Exclusão e visibilidade podem dar falso sucesso.** UPDATE publicado e DELETE não usam .select('id') para confirmar linhas afetadas. Supabase pode retornar sucesso com zero linhas. DELETE de Storage ignora o objeto {error} retornado e pode deixar arquivo órfão.
10. **MÉDIO — Compositores não persistem.** Tabela public.compositores inexistente; código suprime erro de ensureCompositorInDb. O nome digitado pode ir ao registro (quando INSERT for corrigido), mas a lista deduplicada não persiste.
11. **MÉDIO — Nome do instrumento.** DB armazena instrumento_id text; normalização exibe esse ID como se fosse nome, sem JOIN com public.instrumentos (10 registros). Precisa usar instrumentos.id para escrita e instrumentos.nome para UI.
12. **MÉDIO — Catálogo e destaques.** is_featured, featured_order, categoria inexistem; as telas dependem deles. Reordenação foi desabilitada na branch para não alegar persistência falsa. Consulta de publicadas foi corrigida para publicado=true e created_at.
13. **MÉDIO — Preview admin e fallback.** Admin tenta resolver por Edge/Express indisponíveis, depois cria URL assinada em buckets inexistentes e pode abrir modal com URL nula.
14. **MÉDIO — Aluno e Realtime.** StudentPanel usa Number(item.id), Set<number> e assina mudanças na tabela partituras_acessos inexistente; consulta de acessos falha e interface pode mostrar itens protegidos não desbloqueados.
15. **MÉDIO — Política de leitura de registros.** public.partituras tem SELECT para publicado ou admin; isso não substitui controle de Storage nem de acesso a PDFs pagos.
16. **MÉDIO — Não há dados reais para ensaio.** public.partituras tem 0 registros, storage.objects nos buckets de partituras tem 0 objetos, instrumentos tem 10 registros. Build e testes API passam, mas não demonstram upload, acesso ou pagamento ponta a ponta.

## Sequência recomendada de correção (sem executar em produção)
A. Definir contrato de dados e migrar IDs para UUID/string em tipos, UI, backend, conjuntos, webhook, testes; tratar catálogo estático separadamente.
B. Definir arquitetura única de Storage (bucket privado e políticas de leitura que não liberem pagos), incluindo uploads admin e downloads por URLs assinadas emitidas por backend autenticado.
C. Elaborar migração SQL versionada para categoria, destaque, metadados opcionais, compositores, conjuntos, direitos de acesso e índices/RLS; revisar segurança e aplicar somente em ambiente isolado após autorização.
D. Alinhar INSERT/UPDATE/DELETE com colunas reais, validar linhas afetadas e gerenciar upload/movimentação/limpeza de objetos com compensação.
E. Implantar endpoints serverless de signed URL e checkout + webhook Stripe idempotente, conferindo pagamento e direito de acesso antes de assinar URLs.
F. Testar com perfis admin, aluno sem compra, aluno com compra, PDF gratuito, PDF pago, alterações de categoria, revogação, exclusão e atualizações em tempo real.
G. Só depois, revisar e aprovar eventual implantação em produção.

## Observações
Este relatório identifica incompatibilidades confirmadas por leitura estática e metadados. Não afirma que uma exploração de acesso indevido foi demonstrada, nem que checkout ou upload foi executado. Nenhum recurso pago foi contratado. Nenhuma migração foi executada.
