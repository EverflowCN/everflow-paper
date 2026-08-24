-- Expand the resource hub without replacing existing rows, then address the
-- current Supabase security/performance advisor findings.

alter table public.resource_hub_settings
  add column if not exists errata_url text not null default '/archive/',
  add column if not exists updated_note text not null default '持续更新';

alter table public.resource_hub_items
  add column if not exists category text not null default '站点',
  add column if not exists cohort text not null default '通用',
  add column if not exists secondary_url text not null default '',
  add column if not exists primary_label text not null default '立即查看',
  add column if not exists secondary_label text not null default '',
  add column if not exists status text not null default 'available'
    check (status in ('available', 'updating', 'coming')),
  add column if not exists featured boolean not null default false,
  add column if not exists keywords text not null default '';

create index if not exists idx_resource_hub_items_discovery
  on public.resource_hub_items(enabled, cohort, category, featured desc, sort_order, updated_at desc);

grant select on public.resource_hub_settings, public.resource_hub_items to anon, authenticated;
grant insert, update, delete on public.resource_hub_settings, public.resource_hub_items to authenticated;

update public.resource_hub_settings
set
  title = 'Everflow 资料中心',
  subtitle = '408、数学二与站内学习工具，按届别和科目快速查找。',
  announcement = '资料与功能持续整理中；失效入口可通过“更新与勘误”反馈。',
  announcement_enabled = true,
  errata_url = '/archive/',
  updated_note = '面向 27 考研持续更新',
  background_variant = 'paper',
  updated_at = now()
where id = 'default';

update public.resource_hub_items
set category = '408', cohort = '27', primary_label = '开始学习', featured = true,
    keywords = '408 数据结构 组成原理 操作系统 计算机网络 强化 打卡'
where title = '408 强化' and url = '/408/';

update public.resource_hub_items
set category = '站点', cohort = '通用', primary_label = '查看通知',
    keywords = '通知 公告 更新 勘误'
where title = '通知通告' and url = '/archive/';

update public.resource_hub_items
set category = '站点', cohort = '通用', primary_label = '查看会员',
    keywords = '会员 Pro 兑换码'
where title = '会员与兑换码' and url = '/membership/';

insert into public.resource_hub_items
  (title, subtitle, url, icon, group_name, sort_order, enabled, badge, accent,
   category, cohort, secondary_url, primary_label, secondary_label, status, featured, keywords)
select * from (values
  ('408 整套真题', '2009—2026 年整套模式、真题墙与解析', '/zhenti/', 'book', '408 题库', 12, true, '真题', 'red', '408', '27', '/graph/', '进入题库', '知识图谱', 'available', true, '408 真题 真题墙 整套 解析'),
  ('408 算法可视化', '四科 87 个核心算法与系统过程逐步演示', '/visual/', 'play', '408 工具', 14, true, 'NEW', 'dark', '408', '27', '/visual/sandbox/', '按科目学习', '打开沙盒', 'available', true, '408 算法 可视化 数据结构 操作系统 网络 组成原理'),
  ('数据结构强化', '强化题、进度记录与错题复习', '/study/practice/ds-reinforcement/', 'grid', '408 题库', 16, true, 'DS', 'default', '408', '27', '', '开始练习', '', 'available', false, '数据结构 强化 练习 错题'),
  ('408 · 1800 题', '按科目练习与本地/云端进度记录', '/study/practice/1800/', 'grid', '408 题库', 18, true, '1800', 'default', '408', '27', '', '开始刷题', '', 'available', false, '408 1800 选择题 练习'),
  ('李林 880 · 数学二', '章节练习、24 套模拟与下载入口', '/study/practice/math-880/', 'book', '数学二', 22, true, '880', 'red', '数学二', '27', '/study/practice/math-880/simulations.html', '章节练习', '24 套模拟', 'available', true, '数学二 李林 880 模拟卷 章节练习'),
  ('408 整体图谱', '把真题、题库与知识点关系放到一张图里', '/graph/', 'grid', '学习工具', 30, true, 'GRAPH', 'soft', '工具', '通用', '', '打开图谱', '', 'available', false, '408 知识图谱 真题 关系'),
  ('智能组卷', '按条件生成练习卷并保存作答进度', '/relax/', 'download', '学习工具', 32, true, '', 'default', '工具', '通用', '', '开始组卷', '', 'available', false, '408 组卷 练习卷'),
  ('学习热力图', '查看每日学习记录与连续打卡情况', '/study/heatmap/', 'grid', '学习工具', 34, true, '', 'default', '工具', '通用', '', '查看进度', '', 'available', false, '学习 热力图 打卡 进度')
) as seed(title, subtitle, url, icon, group_name, sort_order, enabled, badge, accent,
          category, cohort, secondary_url, primary_label, secondary_label, status, featured, keywords)
where not exists (
  select 1 from public.resource_hub_items existing
  where existing.title = seed.title and existing.url = seed.url
);

-- Optimize RLS predicates so auth.uid() is evaluated once per statement.
drop policy if exists practice_states_select_own on public.practice_states;
create policy practice_states_select_own on public.practice_states
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists practice_states_insert_own on public.practice_states;
create policy practice_states_insert_own on public.practice_states
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists practice_states_update_own on public.practice_states;
create policy practice_states_update_own on public.practice_states
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists practice_states_delete_own on public.practice_states;
create policy practice_states_delete_own on public.practice_states
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists study_checkin_events_select_own on public.study_checkin_events;
create policy study_checkin_events_select_own on public.study_checkin_events
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists study_checkin_events_insert_own on public.study_checkin_events;
create policy study_checkin_events_insert_own on public.study_checkin_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists study_checkin_events_delete_own on public.study_checkin_events;
create policy study_checkin_events_delete_own on public.study_checkin_events
  for delete to authenticated using ((select auth.uid()) = user_id);

-- These functions are trigger-only. Keep definer privileges for the trigger,
-- remove the public RPC surface, and lock down name resolution.
alter function public.log_course_checkin_event() set search_path = '';
alter function public.log_practice_checkin_event() set search_path = '';
revoke execute on function public.log_course_checkin_event() from public, anon, authenticated;
revoke execute on function public.log_practice_checkin_event() from public, anon, authenticated;
