-- Staging: separate legitimate Stripe event IDs may reference the same paid checkout session. Grant remains idempotent.
create or replace function public.tutti_apply_paid_plan(
 p_session_id text,p_event_id text,p_user_id uuid,p_plan_id text,
 p_amount_cents integer,p_paid_at timestamptz
) returns boolean
language plpgsql security invoker set search_path=''
as $$
declare expected_amount integer; v_months integer; v_end timestamptz; v_base timestamptz;
        v_subscription uuid; v_existing record;
begin
 if current_user <> 'service_role' then
   raise exception 'service_role_required' using errcode='42501';
 end if;
 if p_session_id !~ '^cs_test_' or p_event_id !~ '^evt_' or p_user_id is null
  or p_paid_at is null or p_paid_at > now()+interval '5 minutes'
  or p_paid_at < now()-interval '365 days' then
   raise exception 'invalid_paid_event';
 end if;
 select preco_centavos into expected_amount from public.planos
 where id=p_plan_id and ativo=true and recorrencia='unico';
 if expected_amount is null or expected_amount <> p_amount_cents then
   raise exception 'price_mismatch';
 end if;
 if not exists (select 1 from public.usuarios where user_id=p_user_id) then
   raise exception 'unknown_user';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,17));
 select user_id,plano_id,stripe_event_id,revoked_at into v_existing
 from tutti_private.plan_checkout_grants where stripe_session_id=p_session_id;
 if found then
  if v_existing.user_id <> p_user_id or v_existing.plano_id <> p_plan_id then
     raise exception 'session_conflict';
  end if;
  return false; -- Idempotent repeat; cannot regrant a revoked purchase.
 end if;
 if p_plan_id='pro' then v_end:=null;
 else
  v_months:=case p_plan_id when 'mensal' then 1 when 'trimestral' then 3 when 'semestral' then 6 else null end;
  if v_months is null then raise exception 'unknown_plan'; end if;
  select greatest(p_paid_at,coalesce(max(s.data_fim),p_paid_at)) into v_base
  from public.assinaturas_usuarios s
  join tutti_private.plan_checkout_grants g on g.stripe_session_id=s.stripe_checkout_session_id
  where s.user_id=p_user_id and s.plano_id in ('mensal','trimestral','semestral')
    and s.status='ativo' and g.revoked_at is null;
  v_end:=v_base + make_interval(months=>v_months);
 end if;
 insert into tutti_private.plan_checkout_grants(
   stripe_session_id,stripe_event_id,user_id,plano_id,amount_cents,granted_at,access_until)
 values (p_session_id,p_event_id,p_user_id,p_plan_id,p_amount_cents,p_paid_at,v_end);
 insert into public.assinaturas_usuarios(user_id,plano_id,status,data_inicio,data_fim,stripe_checkout_session_id)
 values(p_user_id,p_plan_id,'ativo',p_paid_at,v_end,p_session_id) returning id into v_subscription;
 insert into public.pagamentos(user_id,assinatura_id,stripe_checkout_session_id,valor_centavos,moeda,status,pago_em)
 values(p_user_id,v_subscription,p_session_id,p_amount_cents,'BRL','pago',p_paid_at);
 return true;
end $$;
