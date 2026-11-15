
-- STAGING ONLY. Booking time interpreted in America/Sao_Paulo.
create extension if not exists btree_gist with schema extensions;

create table public.marcacoes_aulas(
 id uuid primary key default gen_random_uuid(),
 aluno_id uuid not null references auth.users(id) on delete cascade,
 aluno_nome text not null,
 aluno_email text not null,
 aluno_telefone text,
 professor_id uuid not null references auth.users(id),
 professor_nome text not null,
 professor_email text,
 data_aula date not null,
 hora_inicio time without time zone not null,
 duracao_minutos integer not null default 60 check(duracao_minutos=60),
 status text not null default 'agendada' check(status in ('agendada','realizada','cancelada')),
 observacoes text,
 link_meet text check(link_meet is null or link_meet ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}([?].*)?$'),
 created_at timestamptz not null default now(),
 constraint booking_no_overlap exclude using gist (
 professor_id with =,
 tsrange(data_aula + hora_inicio, data_aula + hora_inicio + interval '60 minutes','[)') with &&
 ) where (status='agendada')
);
create index marcacoes_aluno_idx on public.marcacoes_aulas(aluno_id,data_aula);
create index marcacoes_professor_idx on public.marcacoes_aulas(professor_id,data_aula);
alter table public.marcacoes_aulas enable row level security;
revoke all on public.marcacoes_aulas from anon,authenticated;
grant select,insert on public.marcacoes_aulas to authenticated;
grant update(status) on public.marcacoes_aulas to authenticated;
-- Compare entitlement coverage at start of class, not just at checkout time.
-- Security definer is in a non-API schema and sees private grant revocations.
create or replace function tutti_private.has_paid_ultra_at(p_user_id uuid,p_when timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
 select
  p_user_id=(select auth.uid()) and p_when is not null and exists (
   select 1 from public.assinaturas_usuarios s
   join tutti_private.plan_checkout_grants g on g.stripe_session_id=s.stripe_checkout_session_id
   where s.user_id=p_user_id and s.plano_id in ('mensal','trimestral','semestral')
     and s.status='ativo' and s.data_inicio<=p_when and s.data_fim>p_when
     and g.revoked_at is null
  )
$$;
revoke all on function tutti_private.has_paid_ultra_at(uuid,timestamptz) from public,anon;
grant execute on function tutti_private.has_paid_ultra_at(uuid,timestamptz) to authenticated;

create policy bookings_self_or_teacher_or_admin on public.marcacoes_aulas for select to authenticated
 using (
  aluno_id=(select auth.uid())
  or (professor_id=(select auth.uid()) and exists(
     select 1 from public.usuarios u where u.user_id=(select auth.uid())
       and u.role='teacher' and u.approval_status='aprovado'))
  or (select tutti_private.is_authorized_developer())
 );
create policy bookings_student_insert on public.marcacoes_aulas for insert to authenticated
 with check (
  aluno_id=(select auth.uid()) and status='agendada'
  and link_meet is null
  and (data_aula + hora_inicio) at time zone 'America/Sao_Paulo' > now()
  and exists(select 1 from public.usuarios u where u.user_id=(select auth.uid())
             and u.role='student')
  and exists(select 1 from auth.users a where a.id=(select auth.uid())
             and a.email_confirmed_at is not null)
  and exists(select 1 from public.usuarios t where t.user_id=professor_id
             and t.role='teacher' and t.approval_status='aprovado')
  and (select tutti_private.has_paid_ultra_at(
      aluno_id,(data_aula + hora_inicio) at time zone 'America/Sao_Paulo'))
 );
create policy bookings_student_cancel on public.marcacoes_aulas for update to authenticated
 using (aluno_id=(select auth.uid()) and status='agendada')
 with check (aluno_id=(select auth.uid()) and status='cancelada');
