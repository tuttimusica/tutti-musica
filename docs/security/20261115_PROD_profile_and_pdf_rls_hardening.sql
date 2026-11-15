-- Production hardening. Removes an overbroad public profile read and
-- unrestricted account-role writes. No existing rows changed/deleted.
-- Replaces storage read policy only for the existing private PDF bucket.
drop policy if exists usuarios_perfis_publicos_select on public.usuarios;
revoke update on public.usuarios from authenticated;
grant update(nome_completo,bio,avatar_url,instrumento_principal,nivel_musical,current_instrument)
 on public.usuarios to authenticated;
revoke update on public.profiles from authenticated;
grant update(full_name,avatar_url,photo_url) on public.profiles to authenticated;

-- Return a deliberately curated teacher directory through an RPC; never publish emails.
-- The public RPC was installed in the additive compatibility migration.

drop policy if exists tutti_partituras_read_storage on storage.objects;
create policy tutti_storage_free_pdf_read on storage.objects
for select to anon,authenticated using(
 bucket_id='tutti-partituras'
 and exists(select 1 from public.partituras p
   where p.storage_bucket=bucket_id and p.storage_path=name
   and p.publicado and p.categoria='gratuita')
);
create policy tutti_storage_owned_paid_pdf_read on storage.objects
for select to authenticated using(
 bucket_id='tutti-partituras' and (
  (select tutti_private.is_authorized_developer())
  or exists(
   select 1 from public.partituras p
   where p.storage_bucket=bucket_id and p.storage_path=name
   and p.publicado and p.categoria='paga'
   and (
      exists(select 1 from public.partituras_acessos a
          where a.partitura_id=p.id and a.user_id=(select auth.uid()))
      or exists(
        select 1 from public.conjuntos_partituras_itens item
        join public.conjuntos_acessos grant_rec on grant_rec.conjunto_id=item.conjunto_id
        where item.partitura_id=p.id and grant_rec.user_id=(select auth.uid()))
   )
  )
 )
);
-- Existing professor approval RPC already validates private.tutti_is_admin.
-- Restrict its SQL EXECUTE visibility to authenticated, not anonymous sessions.
revoke all on function public.tutti_decidir_solicitacao_professor(uuid,boolean) from public,anon;
grant execute on function public.tutti_decidir_solicitacao_professor(uuid,boolean) to authenticated;
