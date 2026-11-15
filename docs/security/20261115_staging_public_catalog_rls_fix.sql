
-- Fix anonymous catalogue access without granting EXECUTE on private admin checks.
drop policy if exists sheets_catalog_or_admin on public.partituras;
create policy sheets_published_catalog on public.partituras for select to anon,authenticated using(publicado);
create policy sheets_admin_read on public.partituras for select to authenticated
 using ((select tutti_private.is_authorized_developer()));
drop policy if exists bundle_catalog_or_admin on public.conjuntos_partituras;
create policy bundles_published_catalog on public.conjuntos_partituras for select to anon,authenticated using(publicado);
create policy bundles_admin_read on public.conjuntos_partituras for select to authenticated
 using ((select tutti_private.is_authorized_developer()));
drop policy if exists bundle_items_visible on public.conjuntos_partituras_itens;
create policy bundle_items_published on public.conjuntos_partituras_itens for select to anon,authenticated
 using (exists(select 1 from public.conjuntos_partituras b where b.id=conjunto_id and b.publicado));
create policy bundle_items_admin_read on public.conjuntos_partituras_itens for select to authenticated
 using ((select tutti_private.is_authorized_developer()));

drop policy if exists tutti_storage_pdf_read on storage.objects;
create policy tutti_storage_pdf_free_read on storage.objects
for select to anon,authenticated
using (
 bucket_id='tutti-partituras'
 and exists (
   select 1 from public.partituras s
   where s.storage_bucket=bucket_id and s.storage_path=name
     and s.publicado and s.categoria='gratuita'
 )
);
create policy tutti_storage_pdf_paid_or_admin_read on storage.objects
for select to authenticated
using (
 bucket_id='tutti-partituras' and (
   (select tutti_private.is_authorized_developer())
   or exists (
     select 1 from public.partituras s
     where s.storage_bucket=bucket_id and s.storage_path=name and s.publicado
       and s.categoria='paga'
       and (
         exists(select 1 from public.partituras_acessos a
                where a.user_id=(select auth.uid()) and a.partitura_id=s.id)
         or exists(
           select 1 from public.conjuntos_partituras_itens i
           join public.conjuntos_acessos a on a.conjunto_id=i.conjunto_id
           where i.partitura_id=s.id and a.user_id=(select auth.uid()))
       )
   )
 )
);
