-- Supabase-native oxygen11 408 catalog.
-- Public users may read the shared course catalog; only service-role code mutates it.

create table if not exists public.oxygen_catalog (
  subject text not null check (subject in ('ds','co','os','cn')),
  item_id text not null,
  title text not null,
  duration text not null default '',
  url text not null default '',
  bvid text not null default '',
  published_at bigint not null default 0,
  source_updated_at timestamptz not null default now(),
  primary key (subject, item_id)
);

create index if not exists oxygen_catalog_subject_published_idx
  on public.oxygen_catalog(subject, published_at, item_id);

alter table public.oxygen_catalog enable row level security;

drop policy if exists oxygen_catalog_public_read on public.oxygen_catalog;
create policy oxygen_catalog_public_read
  on public.oxygen_catalog
  for select
  to anon, authenticated
  using (true);

create table if not exists public.oxygen_catalog_meta (
  id text primary key default 'default' check (id = 'default'),
  updated_at timestamptz,
  sync_status text not null default 'seed' check (sync_status in ('seed','ok','partial','error')),
  message text not null default '',
  subject_status jsonb not null default '{}'::jsonb,
  source jsonb not null default '{}'::jsonb
);

alter table public.oxygen_catalog_meta enable row level security;

drop policy if exists oxygen_catalog_meta_public_read on public.oxygen_catalog_meta;
create policy oxygen_catalog_meta_public_read
  on public.oxygen_catalog_meta
  for select
  to anon, authenticated
  using (true);

insert into public.oxygen_catalog_meta(id, sync_status, message)
values ('default','seed','等待首次 Supabase 原生同步')
on conflict (id) do nothing;
