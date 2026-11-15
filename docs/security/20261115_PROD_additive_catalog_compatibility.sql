-- PRODUCTION additive release: preserve existing users, profiles, PDFs and plan rows.
-- Reviewed against production schema; does not drop tables or modify existing records.
create schema if not exists tutti_private;
revoke all on schema tutti_private from public,anon;
grant usage on schema tutti_private to authenticated,service_role;

alter table public.usuarios add column if not exists current_instrument text;
alter table public.profiles add column if not exists approval_status text;
alter table public.partituras add column if not exists tonalidade text;
alter table public.partituras add column if not exists tom_original text;
alter table public.partituras add column if not exists categoria text not null default 'gratuita'
  check(categoria in ('gratuita','paga'));
alter table public.partituras add column if not exists preco numeric(10,2) not null default 0
  check(preco>=0);
alter table public.partituras add column if not exists is_featured boolean not null default false;
alter table public.partituras add column if not exists featured_order integer not null default 0;
alter table public.partituras alter column publicado set default false;

create table if not exists public.compositores (
 id uuid primary key default gen_random_uuid(),
 nome text not null check (length(trim(nome)) between 1 and 200),
 nome_normalizado text not null unique check(length(trim(nome_normalizado)) between 1 and 200),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.partituras_acessos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 partitura_id uuid not null references public.partituras(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(user_id,partitura_id)
);
create table if not exists public.conjuntos_partituras (
 id uuid primary key default gen_random_uuid(),
 titulo text not null check(length(trim(titulo)) between 1 and 200),
 descricao text,
 preco numeric(10,2) not null check(preco>=0.50),
 publicado boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.conjuntos_partituras_itens (
 conjunto_id uuid not null references public.conjuntos_partituras(id) on delete cascade,
 partitura_id uuid not null references public.partituras(id) on delete cascade,
 primary key(conjunto_id,partitura_id)
);
create table if not exists public.conjuntos_acessos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 conjunto_id uuid not null references public.conjuntos_partituras(id) on delete cascade,
 stripe_session_id text not null unique,
 created_at timestamptz not null default now(),
 unique(user_id,conjunto_id)
);
create index if not exists conjuntos_itens_partitura_idx on public.conjuntos_partituras_itens(partitura_id);

insert into public.planos(id,nome,periodo,preco_centavos,descricao,recorrencia,ativo)
values
 ('pro','Tutti Pro Vitalício','mensal',1990,'Pagamento único; acesso vitalício Pro, sem aulas individuais','unico',true),
 ('mensal','Tutti Ultra Mensal','mensal',29990,'Pagamento antecipado por um mês, renovação manual','unico',true),
 ('trimestral','Tutti Ultra Trimestral','trimestral',79990,'Pagamento antecipado por três meses, renovação manual','unico',true),
 ('semestral','Tutti Ultra Semestral','semestral',164990,'Pagamento antecipado por seis meses, renovação manual','unico',true)
on conflict(id) do nothing;

create or replace function tutti_private.is_authorized_developer()
returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists (
  select 1 from auth.users a
  join public.administradores_autorizados d on lower(d.email)=lower(a.email)
  where a.id=(select auth.uid()) and a.email_confirmed_at is not null
 )
$$;
revoke all on function tutti_private.is_authorized_developer() from public,anon;
grant execute on function tutti_private.is_authorized_developer() to authenticated;

create or replace function tutti_private.list_approved_teachers()
returns table(user_id uuid,nome_completo text,current_instrument text,bio text,avatar_url text)
language sql stable security definer set search_path='' as $$
 select u.user_id,u.nome_completo,coalesce(u.current_instrument,u.instrumento_principal),u.bio,u.avatar_url
 from public.usuarios u
 where u.role='teacher' and u.approval_status='aprovado' and u.is_active
 order by u.nome_completo nulls last
$$;
revoke all on function tutti_private.list_approved_teachers() from public;
grant execute on function tutti_private.list_approved_teachers() to anon,authenticated;
grant usage on schema tutti_private to anon;
create or replace function public.tutti_list_professores()
returns table(user_id uuid,nome_completo text,current_instrument text,bio text,avatar_url text)
language sql stable security invoker set search_path='' as $$
 select * from tutti_private.list_approved_teachers()
$$;
revoke all on function public.tutti_list_professores() from public;
grant execute on function public.tutti_list_professores() to anon,authenticated;

alter table public.compositores enable row level security;
alter table public.partituras_acessos enable row level security;
alter table public.conjuntos_partituras enable row level security;
alter table public.conjuntos_partituras_itens enable row level security;
alter table public.conjuntos_acessos enable row level security;
revoke all on public.compositores,public.partituras_acessos,public.conjuntos_partituras,
 public.conjuntos_partituras_itens,public.conjuntos_acessos from anon,authenticated;
grant select on public.compositores,public.conjuntos_partituras,public.conjuntos_partituras_itens to anon,authenticated;
grant select on public.partituras_acessos,public.conjuntos_acessos to authenticated;
grant insert,update,delete on public.compositores,public.conjuntos_partituras,public.conjuntos_partituras_itens to authenticated;
create policy composers_public_read on public.compositores for select to anon,authenticated using(true);
create policy composers_developer_insert on public.compositores for insert to authenticated
 with check((select tutti_private.is_authorized_developer()));
create policy composers_developer_update on public.compositores for update to authenticated
 using((select tutti_private.is_authorized_developer())) with check((select tutti_private.is_authorized_developer()));
create policy composers_developer_delete on public.compositores for delete to authenticated
 using((select tutti_private.is_authorized_developer()));
create policy bundles_public_catalog on public.conjuntos_partituras for select to anon,authenticated
 using(publicado);
create policy bundles_developer_read on public.conjuntos_partituras for select to authenticated
 using((select tutti_private.is_authorized_developer()));
create policy bundles_developer_insert on public.conjuntos_partituras for insert to authenticated
 with check((select tutti_private.is_authorized_developer()));
create policy bundles_developer_update on public.conjuntos_partituras for update to authenticated
 using((select tutti_private.is_authorized_developer())) with check((select tutti_private.is_authorized_developer()));
create policy bundles_developer_delete on public.conjuntos_partituras for delete to authenticated
 using((select tutti_private.is_authorized_developer()));
create policy bundle_items_public on public.conjuntos_partituras_itens for select to anon,authenticated
 using(exists(select 1 from public.conjuntos_partituras b where b.id=conjunto_id and b.publicado));
create policy bundle_items_owned on public.conjuntos_partituras_itens for select to authenticated
 using(exists(select 1 from public.conjuntos_acessos a where a.conjunto_id=conjunto_id and a.user_id=(select auth.uid())));
create policy bundle_items_dev on public.conjuntos_partituras_itens for select to authenticated
 using((select tutti_private.is_authorized_developer()));
create policy bundle_items_dev_insert on public.conjuntos_partituras_itens for insert to authenticated
 with check((select tutti_private.is_authorized_developer()));
create policy bundle_items_dev_delete on public.conjuntos_partituras_itens for delete to authenticated
 using((select tutti_private.is_authorized_developer()));
create policy sheet_owner_entitlements on public.partituras_acessos for select to authenticated
 using(user_id=(select auth.uid()));
create policy bundle_owner_entitlements on public.conjuntos_acessos for select to authenticated
 using(user_id=(select auth.uid()));

grant select on public.partituras to anon;
create policy sheets_public_catalog on public.partituras for select to anon using(publicado);
create policy sheets_developer_read on public.partituras for select to authenticated
 using((select tutti_private.is_authorized_developer()));
create policy developer_read_users on public.usuarios for select to authenticated
 using((select tutti_private.is_authorized_developer()));
create policy developer_read_profiles on public.profiles for select to authenticated
 using((select tutti_private.is_authorized_developer()));
create policy developer_read_requests on public.solicitacoes_professores for select to authenticated
 using((select tutti_private.is_authorized_developer()));
