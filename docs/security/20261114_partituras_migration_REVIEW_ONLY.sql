-- TUTTI / PARTITURAS - PROPOSTA DE MIGRAÇÃO (NÃO EXECUTADA)
-- Revisar em ambiente isolado, fazer backup e obter aprovação antes de produção.
-- Compatível com schema observado em 2026-11-14. NÃO executar em produção diretamente.
begin;

alter table public.partituras
  add column if not exists categoria text not null default 'gratuita',
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_order integer not null default 0,
  add column if not exists tonalidade text,
  add column if not exists tom_original text,
  add column if not exists tempo_bpm integer,
  add column if not exists compasso text,
  add column if not exists youtube_url text,
  add column if not exists cifras jsonb not null default '[]'::jsonb,
  add column if not exists melodia_notas jsonb not null default '[]'::jsonb,
  add column if not exists preco numeric(12,2) not null default 0;
alter table public.partituras drop constraint if exists partituras_categoria_check;
alter table public.partituras add constraint partituras_categoria_check check (categoria in ('gratuita','paga'));
alter table public.partituras drop constraint if exists partituras_preco_check;
alter table public.partituras add constraint partituras_preco_check check (preco >= 0);
create index if not exists partituras_publicado_destaques_idx on public.partituras (publicado,is_featured,featured_order,created_at desc);

create table if not exists public.compositores (
 id uuid primary key default gen_random_uuid(),
 nome text not null,
 nome_normalizado text not null unique,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 constraint compositores_nome_nonempty check (length(trim(nome)) > 0)
);
alter table public.compositores enable row level security;
drop policy if exists compositores_read on public.compositores;
create policy compositores_read on public.compositores for select to authenticated using (true);
drop policy if exists compositores_admin_insert on public.compositores;
create policy compositores_admin_insert on public.compositores for insert to authenticated with check (private.tutti_is_admin());
drop policy if exists compositores_admin_update on public.compositores;
create policy compositores_admin_update on public.compositores for update to authenticated using (private.tutti_is_admin()) with check (private.tutti_is_admin());
drop policy if exists compositores_admin_delete on public.compositores;
create policy compositores_admin_delete on public.compositores for delete to authenticated using (private.tutti_is_admin());

create table if not exists public.conjuntos_partituras (
 id uuid primary key default gen_random_uuid(),
 titulo text not null,
 descricao text,
 preco numeric(12,2) not null default 0 check(preco >= 0),
 publicado boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.conjuntos_partituras_itens (
 conjunto_id uuid not null references public.conjuntos_partituras(id) on delete cascade,
 partitura_id uuid not null references public.partituras(id) on delete cascade,
 primary key (conjunto_id,partitura_id)
);
create index if not exists conjuntos_itens_partitura_idx on public.conjuntos_partituras_itens(partitura_id);

create table if not exists public.partituras_acessos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 partitura_id uuid not null references public.partituras(id) on delete cascade,
 tipo_acesso text not null default 'compra',
 stripe_session_id text,
 valor_pago numeric(12,2),
 granted_at timestamptz not null default now(),
 unique(user_id,partitura_id)
);
create table if not exists public.conjuntos_acessos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 conjunto_id uuid not null references public.conjuntos_partituras(id) on delete cascade,
 stripe_session_id text,
 granted_at timestamptz not null default now(),
 unique(user_id,conjunto_id)
);
create index if not exists partitura_access_user_idx on public.partituras_acessos(user_id);
create index if not exists conjuntos_access_user_idx on public.conjuntos_acessos(user_id);

alter table public.conjuntos_partituras enable row level security;
alter table public.conjuntos_partituras_itens enable row level security;
alter table public.partituras_acessos enable row level security;
alter table public.conjuntos_acessos enable row level security;

drop policy if exists conjuntos_read on public.conjuntos_partituras;
create policy conjuntos_read on public.conjuntos_partituras for select to anon,authenticated using (publicado or private.tutti_is_admin());
drop policy if exists conjuntos_admin_write on public.conjuntos_partituras;
create policy conjuntos_admin_write on public.conjuntos_partituras for all to authenticated using (private.tutti_is_admin()) with check (private.tutti_is_admin());
drop policy if exists conjuntos_itens_read on public.conjuntos_partituras_itens;
create policy conjuntos_itens_read on public.conjuntos_partituras_itens for select to authenticated using (
 private.tutti_is_admin() or exists (
   select 1 from public.conjuntos_partituras c where c.id=conjunto_id and c.publicado
 )
);
drop policy if exists conjuntos_itens_admin_write on public.conjuntos_partituras_itens;
create policy conjuntos_itens_admin_write on public.conjuntos_partituras_itens for all to authenticated using (private.tutti_is_admin()) with check (private.tutti_is_admin());
drop policy if exists partituras_acessos_self_read on public.partituras_acessos;
create policy partituras_acessos_self_read on public.partituras_acessos for select to authenticated using (user_id=(select auth.uid()) or private.tutti_is_admin());
drop policy if exists conjuntos_acessos_self_read on public.conjuntos_acessos;
create policy conjuntos_acessos_self_read on public.conjuntos_acessos for select to authenticated using (user_id=(select auth.uid()) or private.tutti_is_admin());
-- Nunca permitir INSERT/UPDATE de acessos por alunos; apenas webhook confiável com service_role.

-- A política anterior permitia ler QUALQUER PDF publicado, inclusive pago.
drop policy if exists tutti_partituras_read_storage on storage.objects;
drop policy if exists tutti_partituras_read_free_only on storage.objects;
create policy tutti_partituras_read_free_only on storage.objects
 for select to anon,authenticated using (
 bucket_id='tutti-partituras' and
 (
  private.tutti_is_admin()
  or exists (
   select 1 from public.partituras p
   where p.storage_bucket=objects.bucket_id and p.storage_path=objects.name
     and p.publicado=true and p.categoria='gratuita'
  )
 )
);
-- O acesso aos PDFs pagos usa URL assinada gerada pela API com service_role APÓS conferir a compra.

grant select on public.compositores,public.conjuntos_partituras,public.conjuntos_partituras_itens,public.partituras_acessos,public.conjuntos_acessos to authenticated;
grant select on public.conjuntos_partituras to anon;
grant insert,update,delete on public.compositores,public.conjuntos_partituras,public.conjuntos_partituras_itens to authenticated;
commit;
