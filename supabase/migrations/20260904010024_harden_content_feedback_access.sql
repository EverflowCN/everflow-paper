drop policy if exists "deny direct content feedback access" on public.content_feedback;
create policy "deny direct content feedback access"
  on public.content_feedback
  for all
  to anon, authenticated
  using (false)
  with check (false);

create index if not exists content_feedback_assignee_idx
  on public.content_feedback (assignee_user_id)
  where assignee_user_id is not null;
