-- Production lessons: paid access and 60-minute scheduling. There are no current bookings.
create extension if not exists btree_gist with schema extensions;
alter table public.marcacoes_aulas alter column duracao_minutos set default 60;
alter table public.marcacoes_aulas add constraint tutti_booking_no_overlap exclude using gist(
 professor_id with =,
 tsrange(data_aula+hora_inicio,data_aula+hora_inicio+interval '60 minutes','[)') with &&
) where(status='agendada');

create or replace function tutti_private.is_approved_teacher(p_teacher_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_teacher_id is not null and exists(
  select 1 from public.usuarios u
  where u.user_id=p_teacher_id and u.role='teacher'
  and u.approval_status='aprovado' and u.is_active
 )
$$;
revoke all on function tutti_private.is_approved_teacher(uuid) from public,anon;
grant execute on function tutti_private.is_approved_teacher(uuid) to authenticated;

create or replace function tutti_private.has_paid_ultra_at(p_user_id uuid,p_when timestamptz)
returns boolean language sql stable security definer set search_path='' as $$
 select p_user_id=(select auth.uid()) and p_when is not null and exists(
   select 1 from public.assinaturas_usuarios s
   join tutti_private.plan_checkout_grants g on g.stripe_session_id=s.stripe_checkout_session_id
   where s.user_id=p_user_id and s.plano_id in ('mensal','trimestral','semestral')
   and s.status='ativo' and s.data_inicio<=p_when and s.data_fim>p_when and g.revoked_at is null
 )
$$;
revoke all on function tutti_private.has_paid_ultra_at(uuid,timestamptz) from public,anon;
grant execute on function tutti_private.has_paid_ultra_at(uuid,timestamptz) to authenticated;

drop policy if exists marcacoes_student_insert on public.marcacoes_aulas;
create policy marcacoes_student_insert on public.marcacoes_aulas for insert to authenticated with check(
 aluno_id=(select auth.uid()) and status='agendada' and link_meet is null and duracao_minutos=60
 and (data_aula+hora_inicio) at time zone 'America/Sao_Paulo' > now()
 and (select tutti_private.matches_confirmed_auth_email(aluno_email))
 and (select tutti_private.is_approved_teacher(professor_id))
 and (select tutti_private.has_paid_ultra_at(aluno_id,
    (data_aula+hora_inicio) at time zone 'America/Sao_Paulo'))
);
drop policy if exists marcacoes_update_participants_admin on public.marcacoes_aulas;
revoke update on public.marcacoes_aulas from authenticated;
grant update(status) on public.marcacoes_aulas to authenticated;
create policy marcacoes_student_cancel on public.marcacoes_aulas for update to authenticated
 using(aluno_id=(select auth.uid()) and status='agendada')
 with check(aluno_id=(select auth.uid()) and status='cancelada');
create policy marcacoes_admin_update on public.marcacoes_aulas for update to authenticated
 using((select tutti_private.is_authorized_developer()))
 with check((select tutti_private.is_authorized_developer()));

-- Teacher RPC has a separate privileged paid-entitlement lookup, as students
-- and teachers cannot read each other's private billing rows.
create or replace function tutti_private.book_student_as_teacher(
 p_student_email text,p_date date,p_start time,p_notes text default null,p_phone text default null
) returns public.marcacoes_aulas language plpgsql security definer set search_path=''
as $$
declare v_teacher public.usuarios%rowtype; v_student public.usuarios%rowtype;
        v_email text; v_lesson timestamptz; v_booking public.marcacoes_aulas%rowtype;
begin
 if auth.uid() is null then raise exception 'not_authorized' using errcode='42501'; end if;
 select * into v_teacher from public.usuarios
 where user_id=auth.uid() and role='teacher' and approval_status='aprovado';
 if not found then raise exception 'not_authorized' using errcode='42501'; end if;
 if p_student_email is null or p_date is null or p_start is null or
    p_date + p_start <= (now() at time zone 'America/Sao_Paulo') then
    raise exception 'invalid_booking';
 end if;
 v_email:=lower(trim(p_student_email));
 select u.* into v_student from public.usuarios u
 join auth.users a on a.id=u.user_id
 where lower(a.email)=v_email and a.email_confirmed_at is not null
  and u.role='student';
 if not found then raise exception 'student_not_eligible'; end if;
 v_lesson:=(p_date+p_start) at time zone 'America/Sao_Paulo';
 if not exists (
  select 1 from public.assinaturas_usuarios sub
  join tutti_private.plan_checkout_grants grantrec on grantrec.stripe_session_id=sub.stripe_checkout_session_id
  where sub.user_id=v_student.user_id and sub.plano_id in ('mensal','trimestral','semestral')
   and sub.status='ativo' and sub.data_inicio<=v_lesson and sub.data_fim>v_lesson
   and grantrec.revoked_at is null
 ) then raise exception 'ultra_payment_required' using errcode='42501'; end if;
 insert into public.marcacoes_aulas(
   aluno_id,aluno_nome,aluno_email,aluno_telefone,professor_id,professor_nome,professor_email,
   data_aula,hora_inicio,duracao_minutos,status,observacoes,link_meet)
 values(
   v_student.user_id,coalesce(v_student.nome_completo,v_email),v_email,
   nullif(left(trim(coalesce(p_phone,'')),30),''),
   v_teacher.user_id,coalesce(v_teacher.nome_completo,'Professor Tutti'),v_teacher.email,
   p_date,p_start,60,'agendada',nullif(left(trim(coalesce(p_notes,'')),2000),''),null
 ) returning * into v_booking;
 return v_booking;
end $$;
revoke all on function tutti_private.book_student_as_teacher(text,date,time,text,text) from public,anon;
grant execute on function tutti_private.book_student_as_teacher(text,date,time,text,text) to authenticated;
create or replace function public.tutti_teacher_book_student(
 p_student_email text,p_date date,p_start time,p_notes text default null,p_phone text default null
) returns public.marcacoes_aulas language sql security invoker set search_path=''
as $$ select tutti_private.book_student_as_teacher(p_student_email,p_date,p_start,p_notes,p_phone) $$;
revoke all on function public.tutti_teacher_book_student(text,date,time,text,text) from public,anon;
grant execute on function public.tutti_teacher_book_student(text,date,time,text,text) to authenticated;

create or replace function tutti_private.cancel_teacher_booking(p_booking_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null or not exists(
    select 1 from public.usuarios where user_id=auth.uid()
    and role='teacher' and approval_status='aprovado'
 ) then raise exception 'not_authorized' using errcode='42501'; end if;
 update public.marcacoes_aulas set status='cancelada'
 where id=p_booking_id and professor_id=auth.uid() and status='agendada';
 return found;
end $$;
revoke all on function tutti_private.cancel_teacher_booking(uuid) from public,anon;
grant execute on function tutti_private.cancel_teacher_booking(uuid) to authenticated;
create or replace function public.tutti_teacher_cancel_booking(p_booking_id uuid)
returns boolean language sql security invoker set search_path=''
as $$ select tutti_private.cancel_teacher_booking(p_booking_id) $$;
revoke all on function public.tutti_teacher_cancel_booking(uuid) from public,anon;
grant execute on function public.tutti_teacher_cancel_booking(uuid) to authenticated;

