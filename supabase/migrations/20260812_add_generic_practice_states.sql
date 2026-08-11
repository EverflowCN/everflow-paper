-- Generic practice progress for 408, math and future question lists.
create table if not exists public.practice_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_id text not null,
  item_id text not null,
  subject text not null default '',
  status text not null default 'todo' check (status in ('todo','done','wrong','redo','mastered')),
  note text not null default '',
  first_done_at timestamptz,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, practice_id, item_id)
);

create index if not exists practice_states_practice_idx
  on public.practice_states(practice_id, subject, updated_at desc);

alter table public.practice_states enable row level security;

drop policy if exists practice_states_select_own on public.practice_states;
drop policy if exists practice_states_insert_own on public.practice_states;
drop policy if exists practice_states_update_own on public.practice_states;
drop policy if exists practice_states_delete_own on public.practice_states;

create policy practice_states_select_own
  on public.practice_states for select to authenticated
  using (auth.uid() = user_id);

create policy practice_states_insert_own
  on public.practice_states for insert to authenticated
  with check (auth.uid() = user_id);

create policy practice_states_update_own
  on public.practice_states for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy practice_states_delete_own
  on public.practice_states for delete to authenticated
  using (auth.uid() = user_id);
