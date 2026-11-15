
-- Staging only: enable the verified developer to manage users and requests
-- directly through RLS even when no service-role key is stored in Vercel Preview.
create policy developer_read_users on public.usuarios
for select to authenticated using ((select tutti_private.is_authorized_developer()));
create policy developer_read_profiles on public.profiles
for select to authenticated using ((select tutti_private.is_authorized_developer()));
create policy developer_read_teacher_requests on public.solicitacoes_professores
for select to authenticated using ((select tutti_private.is_authorized_developer()));
create policy developer_read_subscriptions on public.assinaturas_usuarios
for select to authenticated using ((select tutti_private.is_authorized_developer()));
create policy developer_read_payments on public.pagamentos
for select to authenticated using ((select tutti_private.is_authorized_developer()));
create policy developer_cancel_bookings on public.marcacoes_aulas
for update to authenticated
using ((select tutti_private.is_authorized_developer()))
with check ((select tutti_private.is_authorized_developer()));
