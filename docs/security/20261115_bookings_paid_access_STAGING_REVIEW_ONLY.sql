-- STAGING REVIEW ONLY. Do not execute in the production database.
-- Depends on a reviewed/installed plan grants migration and on existing private.user_has_role.
-- Run policy regression tests as authenticated student, teacher and admin before deployment.

-- A private authorization helper is evaluated by RLS. No user-controlled metadata.
-- Definer is necessary to read the private payment ledger, not to grant permissions.
create or replace function tutti_private.student_has_paid_ultra(p_student uuid, p_at timestamptz default now())
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_student is not null and exists (
    select 1 from tutti_private.plan_checkout_grants g
    where g.user_id = p_student
      and g.plano_id in ('mensal','trimestral','semestral')
      and g.granted_at <= p_at and g.access_until > p_at
  );
$$;
revoke all on function tutti_private.student_has_paid_ultra(uuid,timestamptz) from public, anon;
grant usage on schema tutti_private to authenticated;
grant execute on function tutti_private.student_has_paid_ultra(uuid,timestamptz) to authenticated;
-- IMPORTANT: this helper is private schema only, not an exposed public RPC.

-- Student booking: require authenticated identity, approved teacher and active paid Ultra.
-- Existing student insert policy is permissive; REPLACE rather than add another policy.
drop policy if exists marcacoes_student_insert on public.marcacoes_aulas;
create policy marcacoes_student_insert on public.marcacoes_aulas
for insert to authenticated
with check (
  aluno_id = (select auth.uid())
  and status = 'agendada'
  and private.user_has_role(professor_id,'teacher')
  and tutti_private.student_has_paid_ultra(aluno_id, now())
);

-- Do not allow students or teachers to rewrite participant identities via direct UPDATE.
-- Existing UPDATE policy is permissive and does not constrain old/new values.
-- Keep updates admin-only until a dedicated validated reschedule/cancel RPC exists.
drop policy if exists marcacoes_update_participants_admin on public.marcacoes_aulas;
create policy marcacoes_update_admin_only on public.marcacoes_aulas
for update to authenticated
using (private.is_admin())
with check (private.is_admin());

-- Read: students see own bookings; admins see all; teachers see only
-- currently entitled students' bookings. This intentionally hides expired
-- students from teachers; define a separate audited historical reporting view later.
drop policy if exists marcacoes_read_participants_admin on public.marcacoes_aulas;
create policy marcacoes_read_participants_admin on public.marcacoes_aulas
for select to authenticated
using (
  aluno_id = (select auth.uid())
  or private.is_admin()
  or (
    professor_id = (select auth.uid())
    and tutti_private.student_has_paid_ultra(aluno_id, now())
  )
);

-- NOTE: verify no other permissive INSERT/UPDATE/SELECT policies bypass these.
-- NOTE: test whether existing teacher approval logic is truly backed by private.user_has_role.
-- NOTE: booking should additionally verify entitlement at actual lesson time,
-- not merely booking time, and confirm available teacher slots atomically.
-- NOTE: refunds/chargebacks must revoke grants before this is production-safe.
