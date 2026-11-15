
-- Staging-only fix: authenticated applicants cannot SELECT auth.users directly in an RLS expression.
-- Use a narrow, private, stable SECURITY DEFINER boolean to verify their own confirmed email.
create or replace function tutti_private.matches_confirmed_auth_email(p_email text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from auth.users u
    where u.id=(select auth.uid())
      and u.email_confirmed_at is not null
      and lower(u.email)=lower(trim(p_email))
  )
$$;
revoke all on function tutti_private.matches_confirmed_auth_email(text) from public,anon;
grant execute on function tutti_private.matches_confirmed_auth_email(text) to authenticated;

drop policy if exists teacher_request_self_insert on public.solicitacoes_professores;
create policy teacher_request_self_insert on public.solicitacoes_professores
for insert to authenticated with check (
  user_id=(select auth.uid()) and status='pendente'
  and decided_at is null and decided_by is null
  and (select tutti_private.matches_confirmed_auth_email(email))
);
