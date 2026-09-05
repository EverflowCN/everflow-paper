create table if not exists public.owner_focus_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint owner_focus_state_size check (octet_length(state::text) <= 2100000)
);
alter table public.owner_focus_state enable row level security;
revoke all on table public.owner_focus_state from public, anon, authenticated;
grant select, insert, update on table public.owner_focus_state to service_role;
comment on table public.owner_focus_state is 'Personal focus app. Only owner-focus verified server requests may read or mutate; no client Data API access.';
