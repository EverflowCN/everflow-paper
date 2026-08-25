-- Resource hub v4: pure link library managed from Owner Workspace.
-- The public page no longer treats site tools / online practice as resources.

alter table public.resource_hub_items
  add column if not exists links jsonb not null default '[]'::jsonb,
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.resource_hub_items
  alter column url set default '';

-- Existing rows are internal site navigation entries. Preserve them for
-- history/recovery, but remove them from the public resource library.
update public.resource_hub_items
set
  enabled = false,
  url = case when url like '/%' or url ilike '%evera.top%' or url ilike '%evara.top%' then '' else url end,
  secondary_url = case when secondary_url like '/%' or secondary_url ilike '%evera.top%' or secondary_url ilike '%evara.top%' then '' else secondary_url end,
  resource_kind = 'material',
  updated_at = now()
where url like '/%'
   or secondary_url like '/%'
   or url ilike '%evera.top%'
   or url ilike '%evara.top%';

update public.resource_hub_settings
set
  title = 'Everflow 资料中心',
  subtitle = '做题本、讲义与其他资料链接统一收录；所有按钮与链接均由后台维护。',
  announcement = '资源内容仅展示后台已配置的外部链接；如遇失效，可通过更新与勘误反馈。',
  announcement_enabled = true,
  updated_note = '资料链接 · 后台维护 · 持续更新',
  updated_at = now()
where id = 'default';
