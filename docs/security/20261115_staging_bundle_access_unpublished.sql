
-- An acquired bundle must remain downloadable even if the admin hides the bundle
-- from future shoppers. Refunds remove the entitlement record.
create policy bundle_items_owned on public.conjuntos_partituras_itens
for select to authenticated
using (
 exists(select 1 from public.conjuntos_acessos a
 where a.conjunto_id=conjunto_id and a.user_id=(select auth.uid()))
);
