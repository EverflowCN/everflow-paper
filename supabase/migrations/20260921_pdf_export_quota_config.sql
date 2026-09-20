-- PDF export quota controls (Owner-managed)
-- Production defaults: enabled, 15/day, 5/hour, Owner/Admin unlimited.

alter table public.membership_config
  add column if not exists pdf_export_enabled boolean not null default true,
  add column if not exists pdf_export_daily_limit integer not null default 15 check (pdf_export_daily_limit between 1 and 500),
  add column if not exists pdf_export_hourly_limit integer not null default 5 check (pdf_export_hourly_limit between 1 and 100),
  add column if not exists pdf_export_admin_unlimited boolean not null default true;

create or replace function public.pdf_export_enqueue(p_user uuid,p_key uuid,p_payload jsonb,p_priority integer)
returns public.pdf_export_jobs
language plpgsql
security invoker
set search_path=''
as $$
declare
  j public.pdf_export_jobs;
  cfg_enabled boolean := true;
  cfg_daily integer := 15;
  cfg_hourly integer := 5;
  cfg_admin_unlimited boolean := true;
  day_start timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,1));

  select * into j from public.pdf_export_jobs where user_id=p_user and request_key=p_key;
  if found then return j; end if;

  select
    coalesce(pdf_export_enabled,true),
    greatest(1,least(500,coalesce(pdf_export_daily_limit,15))),
    greatest(1,least(100,coalesce(pdf_export_hourly_limit,5))),
    coalesce(pdf_export_admin_unlimited,true)
  into cfg_enabled,cfg_daily,cfg_hourly,cfg_admin_unlimited
  from public.membership_config where id='default';

  if cfg_enabled is not true then raise exception 'PDF_DISABLED'; end if;

  if exists(
    select 1 from public.pdf_export_jobs
    where user_id=p_user
      and status in ('queued','preparing','compiling','storing')
      and expires_at>now()
  ) then
    raise exception 'PDF_ACTIVE_JOB';
  end if;

  if not (cfg_admin_unlimited and p_priority>0) then
    if (
      select count(*) from public.pdf_export_jobs
      where user_id=p_user and created_at>now()-interval '1 hour'
    ) >= cfg_hourly then
      raise exception 'PDF_HOURLY_LIMIT';
    end if;

    day_start := date_trunc('day',now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai';
    if (
      select count(*) from public.pdf_export_jobs
      where user_id=p_user and created_at>=day_start
    ) >= cfg_daily then
      raise exception 'PDF_DAILY_LIMIT';
    end if;
  end if;

  insert into public.pdf_export_jobs(user_id,request_key,payload,priority)
  values(p_user,p_key,p_payload,p_priority)
  returning * into j;
  return j;
end
$$;

revoke all on function public.pdf_export_enqueue(uuid,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.pdf_export_enqueue(uuid,uuid,jsonb,integer) to service_role;
