-- Staging only: keep the exposed API security-invoker, privileged writes isolated in an unexposed schema.
create or replace function tutti_private.decidir_solicitacao_professor(p_solicitacao_id uuid,p_aprovar boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare target_user uuid;
begin
  if (select auth.uid()) is null or not (select tutti_private.is_authorized_developer()) then
    raise exception 'not_authorized' using errcode='42501';
  end if;
  select user_id into target_user from public.solicitacoes_professores
  where id=p_solicitacao_id and status='pendente' for update;
  if target_user is null then return false; end if;
  update public.solicitacoes_professores set
    status=case when p_aprovar then 'aprovado' else 'rejeitado' end,
    decided_at=now(), decided_by=(select auth.uid())
  where id=p_solicitacao_id;
  update public.usuarios set
    role=case when p_aprovar then 'teacher' else 'student' end,
    approval_status=case when p_aprovar then 'aprovado' else 'rejeitado' end,
    updated_at=now() where user_id=target_user;
  update public.profiles set
    role=case when p_aprovar then 'teacher' else 'student' end,
    approval_status=case when p_aprovar then 'aprovado' else 'rejeitado' end
  where id=target_user;
  return true;
end $$;
revoke all on function tutti_private.decidir_solicitacao_professor(uuid,boolean) from public,anon;
grant execute on function tutti_private.decidir_solicitacao_professor(uuid,boolean) to authenticated;
create or replace function public.tutti_decidir_solicitacao_professor(p_solicitacao_id uuid,p_aprovar boolean)
returns boolean language sql security invoker set search_path = ''
as $$ select tutti_private.decidir_solicitacao_professor(p_solicitacao_id,p_aprovar) $$;
revoke all on function public.tutti_decidir_solicitacao_professor(uuid,boolean) from public,anon;
grant execute on function public.tutti_decidir_solicitacao_professor(uuid,boolean) to authenticated;