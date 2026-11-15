-- Production release security cleanup. Trigger functions are not public RPCs.
revoke all on function public.criar_perfil_usuario() from public,anon,authenticated;
revoke all on function public.tutti_create_user_profile() from public,anon,authenticated;
revoke all on function public.tutti_sync_profile_from_auth() from public,anon,authenticated;
alter function public.set_updated_at() set search_path='';
grant select on public.assinaturas_usuarios to authenticated;
create policy assinatura_propria on public.assinaturas_usuarios for select to authenticated
 using(user_id=(select auth.uid()));
