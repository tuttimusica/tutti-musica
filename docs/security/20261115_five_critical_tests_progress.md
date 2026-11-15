# Tutti — progresso dos cinco testes essenciais (2026-11-15)

Projeto de testes Supabase: `vscuqfoyrycfzthexvjy`. Produção: `viwxalwpvuvgcyxsdjbi` **não modificada**.

## Aplicado apenas em staging
- `tutti_staging_core_billing_baseline`: planos, assinaturas, pagamentos e registros privados de concessão; quatro preços verificados.
- `tutti_staging_auth_teacher_approval`: tabelas `usuarios`, `profiles`, `administradores_autorizados`, `solicitacoes_professores`, trigger de criação de perfis e pedidos pendentes, RPC de decisão com verificação de e-mail confirmado e allowlist do servidor.
- Verificado: tabelas presentes, RLS habilitado, `anon` sem EXECUTE na RPC de decisão, `authenticated` com EXECUTE e guarda interna de administrador.
- Advisor aponta INFO sobre tabelas sem política (allowlist e grants privados, intencional) e WARN sobre RPC SECURITY DEFINER autenticada (necessária ao fluxo atual, mas deve ser revisada em testes de autorização negativos).

## Código na branch de auditoria
- `src/context/AuthContext.tsx`: não fabrica mais links Google Meet; só registra evento de aula quando insert funciona. Commit `41b5c2fb09f5f9c677490c5c9aace77707eac8c8`.
- Correções anteriores de checkout e catálogo continuam não implantadas em produção.

## Pendências reais
1. **Cadastro**: teste funcional de email confirmado, reenvio, Google OAuth, contas aluno/professor; observar que a trigger insere solicitação antes da confirmação mas **não concede acesso**.
2. **Professor**: testes negativos de RPC com aluno e anônimo; usuário administrador de staging precisa ter cadastro confirmado; verificar UI e atualização do papel.
3. **Pagamento**: RPC de concessão e revogação, webhooks assinados, refund, preços e renovação manual; NÃO ativar checkout ainda.
4. **Aulas**: tabela de agendamentos e políticas server-side para Ultra pago e data da aula, conflito de horários e integração Google Meet real.
5. **Partituras**: esquema UUID consistente, Storage privado, categorias/compositores, pacotes, direitos de compra e download assinado.
6. **Preview**: ainda sem comprovação de isolamento de variáveis Vercel; não ligar Preview a produção.
7. **Resend**: domínio/remetente precisa ser verificado, não assumir que Gmail externo é válido.
8. **Testes**: nenhum teste ponta a ponta executado; não usar dados de alunos reais nem cobranças reais.

## Nota de segurança
A aprovação em staging usa uma função SECURITY DEFINER em `public`, executável por autenticados, com validação de `auth.uid()`, email confirmado e allowlist do servidor. Supabase sinaliza essa superfície para revisão; antes do lançamento, preferir endpoint administrativo de backend ou RPC em schema privado com concessões mínimas. Não copiar cegamente essa migração para produção.
