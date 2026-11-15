
-- Staging-only: safe public teacher directory with curated fields and teacher lesson tools.
create or replace function tutti_private.list_approved_teachers()
returns table(user_id uuid,nome_completo text,current_instrument text,bio text,avatar_url text)
language sql stable security definer set search_path=''
as $$
 select u.user_id,u.nome_completo,u.current_instrument,u.bio,u.avatar_url
 from public.usuarios u where u.role='teacher' and u.approval_status='aprovado'
 order by u.nome_completo nulls last
$$;
revoke all on function tutti_private.list_approved_teachers() from public;
grant usage on schema tutti_private to anon,authenticated;
grant execute on function tutti_private.list_approved_teachers() to anon,authenticated;

create or replace function public.tutti_list_professores()
returns table(user_id uuid,nome_completo text,current_instrument text,bio text,avatar_url text)
language sql stable security invoker set search_path=''
as $$ select * from tutti_private.list_approved_teachers() $$;
revoke all on function public.tutti_list_professores() from public;
grant execute on function public.tutti_list_professores() to anon,authenticated;

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
