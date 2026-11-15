# Auditoria do catálogo de partituras — rascunho, NÃO EXECUTAR

Data: 2026-11-14. Escopo: branch de auditoria, leitura de metadados do Supabase de produção, sem escrita.

## Bloqueio confirmado

O frontend DeveloperPanel.tsx envia INSERT/UPDATE com colunas que NÃO existem em public.partituras: instrumento, tonalidade, tom_original, nivel, genero, categoria, preco, arquivo_pdf_url, is_featured, featured_order, file_size_bytes, created_by. A tabela real exige instrumento_id (text, NOT NULL), storage_path (text, NOT NULL), e usa estilo_musical, nivel_dificuldade, tamanho_bytes, enviado_por (uuid). O id real é uuid; o frontend normalizeDbPartitura converte para Number, perdendo o identificador. A função de reordenação não persistia e foi desativada na branch. public.compositores não existe, embora o frontend a consulte.

## Implicações

Inserir uma partitura a partir do formulário atual deve falhar por coluna inexistente e/ou instrumento_id ausente. Mesmo com colunas adicionais, a conversão de UUID para Number impede operações confiáveis de edição/exclusão. Não basta adicionar uma coluna para reparar o fluxo.

## Plano de correção proposto (não aplicado)

1. Padronizar IDs de partituras como string UUID em tipos, componentes, consultas e acesso a conjuntos. Não converter IDs em Number. Revisar todas as referências a SheetMusic.id, partitura_id, APIs e testes.
2. Mapear instrumento selecionado para public.instrumentos.id, não gravar nome em coluna inexistente. Validar a chave estrangeira e valores cadastrados.
3. Mapear nivel -> nivel_dificuldade, genero -> estilo_musical, file_size_bytes -> tamanho_bytes e created_by -> enviado_por com auth.uid(), nunca e-mail.
4. Confirmar os buckets reais e políticas de Storage antes de enviar ou mover arquivos; manter bucket + path por registro e bloquear exclusão de objeto quando a operação do banco falhar.
5. Elaborar migração revisável para campos adicionais necessários (categoria, is_featured, featured_order, tonalidade etc.), tabela de compositores, conjuntos e acessos, com RLS e autorização administrativa no backend. Não aplicar antes de backup, revisão e aprovação explícita.
6. Não habilitar checkout ou PDF pago até haver autorização server-side, webhook Stripe validado e armazenamento privado.
7. Testar criação, listagem, edição, destaque, reordenação, exclusão, upload/visualização de PDF e direitos de acesso em ambiente isolado antes de produção.

## Critérios de aceite

- O INSERT persiste e a listagem recupera o mesmo UUID após refresh.
- Edição/exclusão atingem exatamente o registro correto e confirmam erro do banco.
- Destaque e ordenação persistem após reload e são visíveis nos painéis autorizados.
- PDFs gratuitos abrem; PDFs pagos não podem ser obtidos sem direito de acesso.
- Nenhum cliente comum consegue modificar partituras, preços ou permissões.
- Testes automatizados e build passam; testes ponta a ponta com contas de teste passam.

Este arquivo é documentação de auditoria, NÃO é migração SQL nem autorização para alterar produção.
