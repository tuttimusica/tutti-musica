
-- Staging-only: student booking policy must not directly query auth.users
-- or try to SELECT another user's private profile under RLS.
create or replace function tutti_private.is_approved_teacher(p_teacher_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select p_teacher_id is not null and exists(
   select 1 from public.usuarios u where u.user_id=p_teacher_id
   and u.role='teacher' and u.approval_status='aprovado'
  )
$$;
revoke all on function tutti_private.is_approved_teacher(uuid) from public,anon;
grant execute on function tutti_private.is_approved_teacher(uuid) to authenticated;

drop policy if exists bookings_student_insert on public.marcacoes_aulas;
create policy bookings_student_insert on public.marcacoes_aulas
for insert to authenticated with check (
  aluno_id=(select auth.uid()) and status='agendada' and link_meet is null
  and (data_aula+hora_inicio) at time zone 'America/Sao_Paulo' > now()
  and exists(select 1 from public.usuarios u where u.user_id=(select auth.uid()) and u.role='student')
  and (select tutti_private.matches_confirmed_auth_email(aluno_email))
  and (select tutti_private.is_approved_teacher(professor_id))
  and (select tutti_private.has_paid_ultra_at(
    aluno_id,(data_aula+hora_inicio) at time zone 'America/Sao_Paulo'))
);
