-- Everflow notices + editable resource hub
-- Applied to production Supabase on 2026-08-11.

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  content text not null default '',
  level text not null default 'info' check (level in ('info','important','update','event')),
  pinned boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.resource_hub_settings (
  id text primary key default 'default',
  title text not null default 'Everflow 资源导航',
  subtitle text not null default '把常用入口收拢到一个页面。',
  avatar_url text not null default '',
  footer_note text not null default 'Everflow · 彼时流年若水',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.resource_hub_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  url text not null,
  icon text not null default '↗',
  group_name text not null default '常用入口',
  sort_order integer not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_notices_public on public.notices(published, pinned desc, published_at desc);
create index if not exists idx_resource_hub_items_public on public.resource_hub_items(enabled, sort_order, created_at);
create index if not exists idx_notices_created_by on public.notices(created_by);
create index if not exists idx_resource_hub_settings_updated_by on public.resource_hub_settings(updated_by);
create index if not exists idx_resource_hub_items_created_by on public.resource_hub_items(created_by);

alter table public.notices enable row level security;
alter table public.resource_hub_settings enable row level security;
alter table public.resource_hub_items enable row level security;

drop policy if exists notices_public_read on public.notices;
create policy notices_public_read on public.notices for select to anon, authenticated using (published = true or (select public.is_everflow_owner()));
drop policy if exists notices_owner_insert on public.notices;
create policy notices_owner_insert on public.notices for insert to authenticated with check ((select public.is_everflow_owner()));
drop policy if exists notices_owner_update on public.notices;
create policy notices_owner_update on public.notices for update to authenticated using ((select public.is_everflow_owner())) with check ((select public.is_everflow_owner()));
drop policy if exists notices_owner_delete on public.notices;
create policy notices_owner_delete on public.notices for delete to authenticated using ((select public.is_everflow_owner()));

drop policy if exists resource_settings_public_read on public.resource_hub_settings;
create policy resource_settings_public_read on public.resource_hub_settings for select to anon, authenticated using (true);
drop policy if exists resource_settings_owner_insert on public.resource_hub_settings;
create policy resource_settings_owner_insert on public.resource_hub_settings for insert to authenticated with check ((select public.is_everflow_owner()));
drop policy if exists resource_settings_owner_update on public.resource_hub_settings;
create policy resource_settings_owner_update on public.resource_hub_settings for update to authenticated using ((select public.is_everflow_owner())) with check ((select public.is_everflow_owner()));
drop policy if exists resource_settings_owner_delete on public.resource_hub_settings;
create policy resource_settings_owner_delete on public.resource_hub_settings for delete to authenticated using ((select public.is_everflow_owner()));

drop policy if exists resource_items_public_read on public.resource_hub_items;
create policy resource_items_public_read on public.resource_hub_items for select to anon, authenticated using (enabled = true or (select public.is_everflow_owner()));
drop policy if exists resource_items_owner_insert on public.resource_hub_items;
create policy resource_items_owner_insert on public.resource_hub_items for insert to authenticated with check ((select public.is_everflow_owner()));
drop policy if exists resource_items_owner_update on public.resource_hub_items;
create policy resource_items_owner_update on public.resource_hub_items for update to authenticated using ((select public.is_everflow_owner())) with check ((select public.is_everflow_owner()));
drop policy if exists resource_items_owner_delete on public.resource_hub_items;
create policy resource_items_owner_delete on public.resource_hub_items for delete to authenticated using ((select public.is_everflow_owner()));
