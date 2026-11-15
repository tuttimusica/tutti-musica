-- Production teacher-approval compatibility without changing existing teacher requests.
-- Keep private privileged writes; public RPC is security INVOKER with explicit grants.
create or replace function tutti_private.matches_confirmed_auth_email(p_email text)
returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(
   select 1 from auth.users a where a.id=(select auth.uid())
   and a.email_confirmed_at is not null and lower(a.email)=lower(trim(p_email))
 )
$$;
revoke all on function tutti_private.matches_confirmed_auth_email(text) from public,anon;
grant execute on function tutti_private.matches_confirmed_auth_email(text) to authenticated;

drop policy if exists solicitacoes_insert_student on public.solicitacoes_professores;
create policy solicitacoes_insert_student on public.solicitacoes_professores
for insert to authenticated with check (
 user_id=(select auth.uid()) and status='pendente'
 and decided_at is null and decided_by is null
 and (select tutti_private.matches_confirmed_auth_email(email))
);

create or replace function tutti_private.decidir_solicitacao_professor(
 p_solicitacao_id uuid,p_aprovar boolean
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_s public.solicitacoes_professores%rowtype;
begin
 if (select auth.uid()) is null or not (select tutti_private.is_authorized_developer())
 then raise exception 'Acesso negado.' using errcode='42501'; end if;
 select * into v_s from public.solicitacoes_professores
  where id=p_solicitacao_id and status='pendente' for update;
 if not found then return jsonb_build_object('success',false,'reason','not_pending');end if;
 update public.solicitacoes_professores
  set status=case when p_aprovar then 'aprovado' else 'rejeitado' end,
  decided_at=now(),decided_by=(select auth.uid())
  where id=p_solicitacao_id;
 update public.usuarios
  set role=case when p_aprovar then 'teacher' else 'student' end,
      approval_status=case when p_aprovar then 'aprovado' else 'rejeitado' end,
      updated_at=now()
  where user_id=v_s.user_id;
 -- Existing production profiles constrain role to user/admin. Keep that schema stable:
 -- authoritative professor approval lives in usuarios and its request.
 update public.profiles set approval_status=case when p_aprovar then 'aprovado' else 'rejeitado' end
 where id=v_s.user_id;
 insert into public.notificacoes(user_id,tipo,titulo,mensagem,dados)
 values(v_s.user_id,'solicitacao_professor',
  case when p_aprovar then 'Cadastro de professor aprovado' else 'Solicitação de professor recusada' end,
  case when p_aprovar then 'Seu perfil de professor foi habilitado.' else 'Sua solicitação não foi aprovada.' end,
  jsonb_build_object('solicitacao_id',p_solicitacao_id));
 insert into public.eventos_acesso(user_id,perfil,tipo_evento,detalhes)
 values((select auth.uid()),'admin',
  case when p_aprovar then 'professor_aprovado' else 'professor_rejeitado' end,
  jsonb_build_object('solicitacao_id',p_solicitacao_id,'email',v_s.email));
 return jsonb_build_object('success',true,'status',
  case when p_aprovar then 'aprovado' else 'rejeitado' end);
end $$;
revoke all on function tutti_private.decidir_solicitacao_professor(uuid,boolean) from public,anon;
grant execute on function tutti_private.decidir_solicitacao_professor(uuid,boolean) to authenticated;

create or replace function public.tutti_decidir_solicitacao_professor(
 p_solicitacao_id uuid,p_aprovar boolean
) returns jsonb language sql security invoker set search_path='' as $$
 select tutti_private.decidir_solicitacao_professor(p_solicitacao_id,p_aprovar)
$$;
revoke all on function public.tutti_decidir_solicitacao_professor(uuid,boolean) from public,anon;
grant execute on function public.tutti_decidir_solicitacao_professor(uuid,boolean) to authenticated;
