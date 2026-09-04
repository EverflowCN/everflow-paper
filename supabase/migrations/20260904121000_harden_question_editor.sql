drop policy if exists "question revisions remain private" on public.question_override_revisions;
create policy "question revisions remain private"
  on public.question_override_revisions
  for all
  to anon, authenticated
  using (false)
  with check (false);

create index if not exists question_override_revisions_override_idx
  on public.question_override_revisions (override_id)
  where override_id is not null;

create index if not exists question_override_revisions_actor_idx
  on public.question_override_revisions (actor_user_id)
  where actor_user_id is not null;
