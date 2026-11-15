# Tutti — auditoria de cadastro (somente leitura, 2026-11-14)

## Evidências confirmadas no Supabase de produção

Existem **quatro triggers** em `auth.users`:
1. `auth_user_criar_perfil` — AFTER INSERT → `public.criar_perfil_usuario()`
2. `on_auth_user_created` — AFTER INSERT → `public.handle_new_user()`
3. `tutti_create_user_profile` — AFTER INSERT → `public.tutti_create_user_profile()`
4. `tutti_sync_profile_from_auth` — AFTER INSERT OR UPDATE OF email, raw_user_meta_data → `public.tutti_sync_profile_from_auth()`

As três primeiras funções tentam criar um registro em `public.usuarios`; a terceira também cria `public.profiles`. A quarta sincroniza `public.profiles`.

## Riscos e hipóteses a validar

- Há processamento redundante do mesmo cadastro. `ON CONFLICT` evita parte das duplicações, mas a multiplicidade torna o resultado dependente da ordem dos triggers.
- As primeiras duas funções criam `usuarios` sem e-mail explícito, enquanto a terceira preenche e-mail e status; o resultado final depende dos campos que já existirem e dos valores de conflito.
- A criação de uma solicitação de professor **não aparece nessas quatro funções**. É necessário inspecionar o fluxo de cadastro do frontend e outras funções/triggers antes de concluir onde ocorre a falha.
- Um erro em qualquer trigger AFTER INSERT pode abortar o cadastro em `auth.users`; investigar logs antes de remover qualquer trigger.

## Próximas ações propostas (não executadas)

1. Inspecionar triggers em `public.usuarios`, `public.profiles` e `public.solicitacoes_professores`.
2. Verificar a função de cadastro de professor no frontend e sua chamada real de inserção.
3. Elaborar migração **reversível**, validada em ambiente isolado, para consolidar a criação do perfil em um único fluxo.
4. Testar cadastro de aluno, cadastro de professor pendente, aprovação/rejeição, confirmação de e-mail e reenvio.
5. Somente após backup, validação e autorização específica considerar migração no banco de produção.

Nenhuma alteração de banco foi aplicada nesta auditoria.
