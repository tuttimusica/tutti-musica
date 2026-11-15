-- Production booking trigger compatibility: allow ONLY an approved teacher to
-- create an Ultra-gated booking for a student via the privileged RPC.
-- Direct insert still fails the public RLS policy for teachers.
create or replace function private.protect_booking_participants()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or private.is_admin() or
    (select tutti_private.is_authorized_developer())
 then return new;end if;
 if TG_OP='INSERT' then
   if new.aluno_id is distinct from (select auth.uid()) then
      if new.professor_id is distinct from (select auth.uid()) or
         not (select tutti_private.is_approved_teacher(new.professor_id))
      then raise exception 'O aluno do agendamento deve ser o usuário atual.'
       using errcode='42501';end if;
   end if;
   if not (select tutti_private.is_approved_teacher(new.professor_id))
   then raise exception 'O destinatário deve ser um professor credenciado.'
     using errcode='42501';end if;
 else
   if new.aluno_id is distinct from old.aluno_id
    or new.professor_id is distinct from old.professor_id
   then raise exception 'Não é permitido trocar os participantes do agendamento.'
     using errcode='42501';end if;
 end if;
 return new;
end $$;