-- REVIEW ONLY. Apply to a separate staging database after backup/review.
-- All writes to this function are performed by a trusted, signature-verifying Stripe webhook.
-- Never expose this RPC to anon/authenticated.
create schema if not exists tutti_private;

create table if not exists tutti_private.plan_checkout_grants (
  stripe_session_id text primary key,
  stripe_event_id text not null unique,
  user_id uuid not null references auth.users(id),
  plano_id text not null check (plano_id in ('pro','mensal','trimestral','semestral')),
  amount_cents integer not null check (amount_cents > 0),
  granted_at timestamptz not null default now(),
  access_until timestamptz,
  check ((plano_id = 'pro' and access_until is null) or (plano_id <> 'pro' and access_until is not null))
);

revoke all on schema tutti_private from public, anon, authenticated;
revoke all on all tables in schema tutti_private from public, anon, authenticated;

-- Use an atomic, idempotent grant function to avoid duplicate renewals from Stripe retries.
-- Called by the server only after signature verification AND Stripe session retrieval.
create or replace function public.tutti_apply_paid_plan(
  p_session_id text,
  p_event_id text,
  p_user_id uuid,
  p_plan_id text,
  p_amount_cents integer,
  p_paid_at timestamptz
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_months integer;
  v_amount integer;
  v_existing_end timestamptz;
  v_end timestamptz;
  v_start timestamptz;
begin
  if p_session_id is null or p_session_id !~ '^cs_' or
     p_event_id is null or p_event_id !~ '^evt_' or
     p_user_id is null or p_paid_at is null then
    raise exception 'invalid_payment_identity';
  end if;

  case p_plan_id
    when 'pro' then v_months := null; v_amount := 1990;
    when 'mensal' then v_months := 1; v_amount := 29990;
    when 'trimestral' then v_months := 3; v_amount := 79990;
    when 'semestral' then v_months := 6; v_amount := 164990;
    else raise exception 'invalid_plan';
  end case;
  if p_amount_cents is distinct from v_amount then raise exception 'invalid_amount'; end if;

  -- Serialize purchases/renewals for this user across concurrent webhook deliveries.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 9271));
  if exists(select 1 from tutti_private.plan_checkout_grants where stripe_session_id = p_session_id) then
    return false;
  end if;
  if exists(select 1 from tutti_private.plan_checkout_grants where stripe_event_id = p_event_id) then
    return false;
  end if;

  if v_months is not null then
    select max(data_fim) into v_existing_end
      from public.assinaturas_usuarios
      where user_id = p_user_id and plano_id in ('mensal','trimestral','semestral')
        and status = 'ativo' and data_fim > p_paid_at;
    v_start := greatest(p_paid_at, coalesce(v_existing_end,p_paid_at));
    v_end := v_start + make_interval(months => v_months);
  end if;

  insert into tutti_private.plan_checkout_grants
    (stripe_session_id,stripe_event_id,user_id,plano_id,amount_cents,granted_at,access_until)
  values (p_session_id,p_event_id,p_user_id,p_plan_id,p_amount_cents,p_paid_at,v_end);

  insert into public.assinaturas_usuarios
    (user_id,plano_id,status,data_inicio,data_fim,stripe_checkout_session_id,cancel_at_period_end)
  values (p_user_id,p_plan_id,'ativo',p_paid_at,v_end,p_session_id,true);
  return true;
end;
$$;

revoke all on function public.tutti_apply_paid_plan(text,text,uuid,text,integer,timestamptz) from public, anon, authenticated;
grant execute on function public.tutti_apply_paid_plan(text,text,uuid,text,integer,timestamptz) to service_role;

-- A separate review is required before rollout:
-- 1. Existing plans/RLS may rely on different columns or uniqueness constraints.
-- 2. Implement refunds/chargebacks, and enforce access by checking unexpired grants.
-- 3. Audit existing policies on marcacoes_aulas and professor visibility.
-- 4. Grant the service_role access to the private schema/table as needed by the function owner.
