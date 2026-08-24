-- Model the resource hub as a workbook/material library with independent
-- Baidu, Quark, internal-site, or other links. Existing URLs remain intact.

alter table public.resource_hub_items
  add column if not exists primary_provider text not null default 'auto'
    check (primary_provider in ('auto', 'baidu', 'quark', 'site', 'external')),
  add column if not exists secondary_provider text not null default 'auto'
    check (secondary_provider in ('auto', 'baidu', 'quark', 'site', 'external')),
  add column if not exists resource_kind text not null default 'workbook'
    check (resource_kind in ('workbook', 'course', 'material', 'tool', 'other'));

create index if not exists idx_resource_hub_items_kind
  on public.resource_hub_items(enabled, resource_kind, category, sort_order);

update public.resource_hub_settings
set
  title = 'Everflow 做题本与资料',
  subtitle = '集中查找 408、数学二做题本与课程资料；每项可同时提供百度网盘、夸克网盘或站内入口。',
  announcement = '网盘链接仅展示后台已配置的地址；如遇失效，请通过“更新与勘误”反馈。',
  updated_note = '做题本 · 双网盘 · 持续更新',
  updated_at = now()
where id = 'default';

update public.resource_hub_items
set
  primary_provider = case
    when url like '/%' then 'site'
    when url ilike '%pan.baidu.com%' then 'baidu'
    when url ilike '%pan.quark.cn%' or url ilike '%quark.cn%' then 'quark'
    when url <> '' then 'external'
    else 'auto'
  end,
  secondary_provider = case
    when secondary_url like '/%' then 'site'
    when secondary_url ilike '%pan.baidu.com%' then 'baidu'
    when secondary_url ilike '%pan.quark.cn%' or secondary_url ilike '%quark.cn%' then 'quark'
    when secondary_url <> '' then 'external'
    else 'auto'
  end,
  resource_kind = case
    when title in ('408 强化') then 'course'
    when title in ('408 整套真题', '数据结构强化', '408 · 1800 题', '李林 880 · 数学二', '智能组卷') then 'workbook'
    when title in ('408 算法可视化', '408 整体图谱', '学习热力图') then 'tool'
    else 'other'
  end;

update public.resource_hub_items
set category = '408 做题本', group_name = '408 做题本'
where title in ('408 整套真题', '数据结构强化', '408 · 1800 题', '智能组卷');

update public.resource_hub_items
set category = '数学做题本', group_name = '数学做题本'
where title = '李林 880 · 数学二';

update public.resource_hub_items
set category = '课程资料', group_name = '课程资料'
where title = '408 强化';

update public.resource_hub_items
set category = '学习工具', group_name = '学习工具'
where title in ('408 算法可视化', '408 整体图谱', '学习热力图');

-- These are site-navigation entries, not learning resources. Keep the rows in
-- the CMS for recovery, but stop publishing them in the resource library.
update public.resource_hub_items
set enabled = false, resource_kind = 'other'
where title in ('通知通告', '会员与兑换码');
