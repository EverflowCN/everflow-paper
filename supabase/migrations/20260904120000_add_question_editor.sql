create table if not exists public.question_overrides (
  id uuid primary key default gen_random_uuid(),
  bank text not null check (bank in ('zhenti', 'relax1000')),
  entity_id text not null check (char_length(entity_id) between 3 and 160),
  patch jsonb not null default '{}'::jsonb check (jsonb_typeof(patch) = 'object'),
  enabled boolean not null default true,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank, entity_id)
);

create table if not exists public.question_override_revisions (
  id uuid primary key default gen_random_uuid(),
  override_id uuid references public.question_overrides(id) on delete set null,
  bank text not null check (bank in ('zhenti', 'relax1000')),
  entity_id text not null,
  revision integer not null check (revision > 0),
  action text not null check (action in ('save', 'restore')),
  patch jsonb not null default '{}'::jsonb check (jsonb_typeof(patch) = 'object'),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.question_overrides enable row level security;
alter table public.question_override_revisions enable row level security;

revoke all on table public.question_overrides from anon, authenticated;
revoke all on table public.question_override_revisions from anon, authenticated;
grant select (bank, entity_id, patch, enabled, revision, updated_at)
  on table public.question_overrides to anon, authenticated;

drop policy if exists "read enabled question overrides" on public.question_overrides;
create policy "read enabled question overrides"
  on public.question_overrides
  for select
  to anon, authenticated
  using (enabled);

create index if not exists question_overrides_public_idx
  on public.question_overrides (bank, entity_id)
  where enabled;

create index if not exists question_override_revisions_entity_idx
  on public.question_override_revisions (bank, entity_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-assets',
  'question-assets',
  true,
  4194304,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

comment on table public.question_overrides is
  'Published owner-authored corrections applied over immutable question-bank source files.';
comment on table public.question_override_revisions is
  'Private append-only history for question override saves and restores.';
