create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references auth.users(id) on delete set null,
  bank text not null default 'other' check (bank in ('zhenti','relax1000','course','resource','site','other')),
  entity_id text not null default '',
  page_path text not null default '/',
  category text not null default 'other' check (category in ('stem','options','answer','image','explanation','link','other')),
  description text not null check (char_length(description) between 8 and 2000),
  context jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','in_progress','resolved','dismissed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assignee_user_id uuid references auth.users(id) on delete set null,
  resolution_note text not null default '',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_feedback enable row level security;
revoke all on table public.content_feedback from anon, authenticated;

create index if not exists content_feedback_open_created_idx
  on public.content_feedback (created_at desc)
  where status in ('open','in_progress');

create index if not exists content_feedback_reporter_created_idx
  on public.content_feedback (reporter_user_id, created_at desc);

create index if not exists content_feedback_entity_idx
  on public.content_feedback (bank, entity_id)
  where entity_id <> '';

comment on table public.content_feedback is 'Authenticated content correction reports managed only through verified Edge Functions.';
