alter table public.content_feedback
  add column if not exists reporter_notified_at timestamptz;

create index if not exists content_feedback_pending_notification_idx
  on public.content_feedback (reporter_user_id, resolved_at asc)
  where status = 'resolved'
    and reporter_user_id is not null
    and reporter_notified_at is null;

comment on column public.content_feedback.reporter_notified_at is
  'Set when the reporter has received the one-time resolved-feedback notification.';
