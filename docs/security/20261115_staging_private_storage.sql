
-- Staging only: Supabase docs permit SQL bucket creation. Do not modify storage.objects directly.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('tutti-partituras','tutti-partituras',false,10485760,array['application/pdf'])
on conflict (id) do nothing;

-- Secure direct Storage downloads and signed URLs by catalogue/ownership policy.
-- A published paid PDF is NOT readable without an explicit ownership record.
create policy tutti_storage_pdf_read on storage.objects
for select to anon,authenticated
using (
 bucket_id='tutti-partituras'
 and (
   (select tutti_private.is_authorized_developer())
   or exists (
     select 1 from public.partituras s
     where s.storage_bucket=bucket_id and s.storage_path=name and s.publicado
       and (
          s.categoria='gratuita'
          or (
            (select auth.uid()) is not null
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
   )
 )
);
create policy tutti_storage_pdf_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id='tutti-partituras' and (select tutti_private.is_authorized_developer()));
create policy tutti_storage_pdf_admin_update on storage.objects
for update to authenticated
using (bucket_id='tutti-partituras' and (select tutti_private.is_authorized_developer()))
with check (bucket_id='tutti-partituras' and (select tutti_private.is_authorized_developer()));
create policy tutti_storage_pdf_admin_delete on storage.objects
for delete to authenticated
using (bucket_id='tutti-partituras' and (select tutti_private.is_authorized_developer()));
