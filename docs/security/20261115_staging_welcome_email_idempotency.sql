-- STAGING ONLY. Welcome emails are emitted only by an authenticated server action.
create table tutti_private.welcome_email_deliveries(
  user_id uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz,
  sent_at timestamptz,
  resend_id text,
  attempts integer not null default 0,
  last_error text
);
alter table tutti_private.welcome_email_deliveries enable row level security;
revoke all on tutti_private.welcome_email_deliveries from public,anon,authenticated;
grant select,insert,update on tutti_private.welcome_email_deliveries to service_role;

create or replace function public.tutti_claim_welcome_email(p_user_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare claimed uuid;
begin
 if current_user<>'service_role' then raise exception 'service_role_required' using errcode='42501';end if;
 if p_user_id is null or not exists(select 1 from public.usuarios where user_id=p_user_id) then return false;end if;
 insert into tutti_private.welcome_email_deliveries(user_id,claimed_at,attempts)
 values(p_user_id,now(),1)
 on conflict(user_id) do update
 set claimed_at=excluded.claimed_at, attempts=tutti_private.welcome_email_deliveries.attempts+1,
     last_error=null
 where tutti_private.welcome_email_deliveries.sent_at is null and
       (tutti_private.welcome_email_deliveries.claimed_at is null or
        tutti_private.welcome_email_deliveries.claimed_at<now()-interval '15 minutes')
 returning user_id into claimed;
 return claimed is not null;
end $$;
revoke all on function public.tutti_claim_welcome_email(uuid) from public,anon,authenticated;
grant execute on function public.tutti_claim_welcome_email(uuid) to service_role;

create or replace function public.tutti_mark_welcome_email(p_user_id uuid,p_resend_id text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if current_user<>'service_role' then raise exception 'service_role_required' using errcode='42501';end if;
 if p_resend_id is null or length(trim(p_resend_id))<2 then raise exception 'invalid_resend_id';end if;
 update tutti_private.welcome_email_deliveries
 set sent_at=now(),resend_id=left(p_resend_id,200),last_error=null
 where user_id=p_user_id and claimed_at is not null and sent_at is null;
 return found;
end $$;
revoke all on function public.tutti_mark_welcome_email(uuid,text) from public,anon,authenticated;
grant execute on function public.tutti_mark_welcome_email(uuid,text) to service_role;

create or replace function public.tutti_release_welcome_email(p_user_id uuid,p_error text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if current_user<>'service_role' then raise exception 'service_role_required' using errcode='42501';end if;
 update tutti_private.welcome_email_deliveries
 set claimed_at=null,last_error=left(coalesce(p_error,'send_failed'),200)
 where user_id=p_user_id and sent_at is null;
 return found;
end $$;
revoke all on function public.tutti_release_welcome_email(uuid,text) from public,anon,authenticated;
grant execute on function public.tutti_release_welcome_email(uuid,text) to service_role;