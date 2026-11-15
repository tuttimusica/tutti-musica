
-- STAGING ONLY: create the sheet-music data model used by DeveloperPanel and partitura APIs.
-- Never apply this draft blindly to the existing production schema.
create or replace function tutti_private.is_authorized_developer()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    join public.administradores_autorizados a on lower(a.email)=lower(u.email)
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  )
$$;
revoke all on function tutti_private.is_authorized_developer() from public,anon;
grant usage on schema tutti_private to authenticated;
grant execute on function tutti_private.is_authorized_developer() to authenticated;

create table public.compositores (
 id uuid primary key default gen_random_uuid(),
 nome text not null check (char_length(trim(nome)) between 1 and 200),
 nome_normalizado text not null unique check (char_length(trim(nome_normalizado)) between 1 and 200),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table public.partituras (
 id uuid primary key default gen_random_uuid(),
 titulo text not null check (char_length(trim(titulo)) between 1 and 300),
 compositor text not null,
 instrumento_id text not null,
 tonalidade text,
 tom_original text,
 nivel_dificuldade text not null default 'Intermediário',
 estilo_musical text not null default 'Outro',
 descricao text,
 categoria text not null default 'gratuita' check (categoria in ('gratuita','paga')),
 preco numeric(10,2) not null default 0 check (preco >= 0),
 publicado boolean not null default false,
 is_featured boolean not null default false,
 featured_order integer not null default 0,
 storage_bucket text not null default 'tutti-partituras' check (storage_bucket='tutti-partituras'),
 storage_path text not null unique,
 tamanho_bytes bigint not null default 0 check(tamanho_bytes >= 0),
 enviado_por uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index partituras_publicadas_idx on public.partituras (publicado,categoria,created_at desc);
create table public.partituras_acessos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 partitura_id uuid not null references public.partituras(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(user_id,partitura_id)
);
create table public.conjuntos_partituras (
 id uuid primary key default gen_random_uuid(),
 titulo text not null check (length(trim(titulo)) between 1 and 200),
 descricao text,
 preco numeric(10,2) not null check (preco >= 0.50),
 publicado boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.conjuntos_partituras_itens (
 conjunto_id uuid not null references public.conjuntos_partituras(id) on delete cascade,
 partitura_id uuid not null references public.partituras(id) on delete cascade,
 primary key(conjunto_id,partitura_id)
);
create index conjuntos_itens_partitura_idx on public.conjuntos_partituras_itens(partitura_id);
create table public.conjuntos_acessos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 conjunto_id uuid not null references public.conjuntos_partituras(id) on delete cascade,
 stripe_session_id text not null unique,
 created_at timestamptz not null default now(),
 unique(user_id,conjunto_id)
);
create table public.stripe_eventos (
 id text primary key,
 tipo text not null,
 payload jsonb not null,
 processado boolean not null default false,
 processado_em timestamptz,
 erro text,
 created_at timestamptz not null default now()
);
alter table public.compositores enable row level security;
alter table public.partituras enable row level security;
alter table public.partituras_acessos enable row level security;
alter table public.conjuntos_partituras enable row level security;
alter table public.conjuntos_partituras_itens enable row level security;
alter table public.conjuntos_acessos enable row level security;
alter table public.stripe_eventos enable row level security;
revoke all on public.compositores,public.partituras,public.partituras_acessos,
  public.conjuntos_partituras,public.conjuntos_partituras_itens,public.conjuntos_acessos,
  public.stripe_eventos from anon,authenticated;
grant select on public.compositores,public.partituras,public.conjuntos_partituras,public.conjuntos_partituras_itens to anon,authenticated;
grant select on public.partituras_acessos,public.conjuntos_acessos to authenticated;
grant insert,update,delete on public.compositores,public.partituras,public.conjuntos_partituras,public.conjuntos_partituras_itens to authenticated;
create policy composers_read on public.compositores for select to anon,authenticated using (true);
create policy composers_admin_insert on public.compositores for insert to authenticated with check ((select tutti_private.is_authorized_developer()));
create policy composers_admin_update on public.compositores for update to authenticated
 using ((select tutti_private.is_authorized_developer())) with check ((select tutti_private.is_authorized_developer()));
create policy composers_admin_delete on public.compositores for delete to authenticated using ((select tutti_private.is_authorized_developer()));
create policy sheets_catalog_or_admin on public.partituras for select to anon,authenticated
 using (publicado or (select tutti_private.is_authorized_developer()));
create policy sheets_admin_insert on public.partituras for insert to authenticated
 with check ((select tutti_private.is_authorized_developer()));
create policy sheets_admin_update on public.partituras for update to authenticated
 using ((select tutti_private.is_authorized_developer())) with check ((select tutti_private.is_authorized_developer()));
create policy sheets_admin_delete on public.partituras for delete to authenticated
 using ((select tutti_private.is_authorized_developer()));
create policy bundle_catalog_or_admin on public.conjuntos_partituras for select to anon,authenticated
 using (publicado or (select tutti_private.is_authorized_developer()));
create policy bundle_admin_insert on public.conjuntos_partituras for insert to authenticated
 with check ((select tutti_private.is_authorized_developer()));
create policy bundle_admin_update on public.conjuntos_partituras for update to authenticated
 using ((select tutti_private.is_authorized_developer())) with check ((select tutti_private.is_authorized_developer()));
create policy bundle_admin_delete on public.conjuntos_partituras for delete to authenticated
 using ((select tutti_private.is_authorized_developer()));
create policy bundle_items_visible on public.conjuntos_partituras_itens for select to anon,authenticated
 using (exists(select 1 from public.conjuntos_partituras b where b.id=conjunto_id and b.publicado)
   or (select tutti_private.is_authorized_developer()));
create policy bundle_items_admin_insert on public.conjuntos_partituras_itens for insert to authenticated
 with check ((select tutti_private.is_authorized_developer()));
create policy bundle_items_admin_delete on public.conjuntos_partituras_itens for delete to authenticated
 using ((select tutti_private.is_authorized_developer()));
create policy sheets_access_owner on public.partituras_acessos for select to authenticated
 using (user_id=(select auth.uid()));
create policy bundles_access_owner on public.conjuntos_acessos for select to authenticated
 using (user_id=(select auth.uid()));
-- No client writes to entitlements or events; only backend using service_role.
