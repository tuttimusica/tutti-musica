-- Production: allow the verified, email-confirmed Tutti developer to approve teachers
-- without weakening the self-escalation protections for ordinary users.
create or replace function private.protect_user_role()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null then return new; end if;
 if TG_OP='INSERT' then
   if new.role<>'student'
     and not private.is_admin()
     and not (select tutti_private.is_authorized_developer())
   then raise exception 'Somente um administrador pode atribuir esse papel.' using errcode='42501';end if;
 else
   if new.role is distinct from old.role
     and not private.is_admin()
     and not (select tutti_private.is_authorized_developer())
   then raise exception 'Você não tem permissão para alterar o próprio papel.' using errcode='42501';end if;
 end if;
 return new;
end $$;