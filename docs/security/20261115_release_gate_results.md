# Tutti — verificação de integração e bloqueios de lançamento (15/11/2026)

## Escopo
Auditoria na branch `audit/backend-auth-safe-fixes-20261114`, projeto Supabase isolado `vscuqfoyrycfzthexvjy` e Vercel Preview. **Nenhuma alteração em produção; nenhuma cobrança real.**

## Resultados verificados
- Supabase staging: sete tabelas públicas instaladas, RLS habilitado; catálogo com quatro preços de pagamento único. Trigger de cadastro e RPC de aprovação presentes; nenhuma conta fictícia autenticada foi testada de ponta a ponta.
- RLS negativo: role `anon` recebeu `permission denied` ao consultar `public.usuarios`; não tem permissão de execução da RPC de aprovação. Os bloqueios são esperados.
- Vercel: builds da branch chegaram a `READY` (compilação), incluindo commit `274d287aeaf9511e01295845c4e03750b9ce09a2`; a execução GitHub Actions de testes de segurança API nesse commit concluiu `success`. Isso **não** prova fluxos funcionais.
- Segurança de configuração: `src/lib/supabase.ts` deixou de usar fallback para produção. Sem URL/chave válida, a build deve falhar em vez de conectar silenciosamente ao banco principal.
- Vercel: adicionadas variáveis **exclusivas da branch Preview** para URL/chave pública do Supabase de testes; `TUTTI_PAYMENT_TEST_MODE=false`. A primeira build da correção antecedeu a criação dessas variáveis: um novo build é necessário para embuti-las.
- Stripe: conta escolhida `Tutti Musica`, `livemode=false`. **Zero produtos e zero preços** atualmente; não há checkout funcional. Nenhum produto criado, nenhum imposto ou assinatura ativados.
- Código de agendamento: removida fabricação de links Google Meet; o evento de aula só é registrado após insert bem-sucedido.

## Estado dos cinco testes
1. Cadastro de aluno e e-mail: **não validado ponta a ponta**; precisa Auth URL, SMTP/remetente e usuário fictício.
2. Solicitação/aprovação de professor: **migração estrutural aplicada**, mas ainda faltam testes com contas autenticadas e negativas de acesso.
3. Pagamento: **bloqueado** por falta de produtos/preços Stripe, RPC grant/revoke e webhook de teste integrado.
4. Aula: **bloqueado** por falta de tabela/políticas de agendamento e validação da integração real Meet.
5. Partituras: **bloqueado** por falta de esquema/storage/pacotes/permissões no staging.

## Decisão de release
**NÃO APROVADO para lançamento.** Não fazer merge, não ativar pagamentos reais, não trocar produção. Continuar correções e testes com dados fictícios, Vercel Preview e Supabase isolado.

## Próximas ações técnicas
- Confirmar build Vercel posterior à criação das variáveis e smoke test de endpoints; validar que bundle aponta a staging.
- Implementar migrações faltantes e testar acesso negativo/positivo com contas fictícias.
- Configurar Stripe test one-time e webhook sem habilitar Stripe Tax ou assinaturas recorrentes inadvertidamente.
- Verificar remetente Resend antes de envio automático e aprovar URLs de callback Auth.
