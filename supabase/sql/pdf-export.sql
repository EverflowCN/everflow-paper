-- Private durable queue. Only the authenticated Edge Function's service role accesses it.
create table if not exists public.pdf_export_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 request_key uuid not null, payload jsonb not null, priority integer not null default 0,
 status text not null default 'queued' check(status in ('queued','preparing','compiling','storing','completed','failed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz, attempts integer not null default 0,
 object_path text, error text, expires_at timestamptz not null default now()+interval '24 hours',
 unique(user_id,request_key)
);
alter table public.pdf_export_jobs enable row level security;
revoke all on public.pdf_export_jobs from anon,authenticated;
grant all on public.pdf_export_jobs to service_role;
drop policy if exists "pdf_export_jobs_deny_client_access" on public.pdf_export_jobs;
create policy "pdf_export_jobs_deny_client_access"
on public.pdf_export_jobs
for all
to anon, authenticated
using (false)
with check (false);
create index if not exists pdf_export_queue_order on public.pdf_export_jobs(priority desc,created_at) where status='queued';
create index if not exists pdf_export_user on public.pdf_export_jobs(user_id,created_at desc);
create index if not exists pdf_export_expiry on public.pdf_export_jobs(expires_at);
create table if not exists public.pdf_export_config (
 id text primary key default 'default' check(id='default'),
 enabled boolean not null default true,
 daily_limit integer not null default 15 check(daily_limit between 1 and 500),
 hourly_limit integer not null default 5 check(hourly_limit between 1 and 100),
 admin_unlimited boolean not null default true,
 updated_at timestamptz not null default now()
);
insert into public.pdf_export_config(id) values('default') on conflict(id) do nothing;
alter table public.pdf_export_config enable row level security;
revoke all on public.pdf_export_config from public,anon,authenticated;
grant all on public.pdf_export_config to service_role;
drop policy if exists "pdf_export_config_deny_client_access" on public.pdf_export_config;
create policy "pdf_export_config_deny_client_access" on public.pdf_export_config for all to anon,authenticated using(false) with check(false);

create or replace function public.pdf_export_enqueue(p_user uuid,p_key uuid,p_payload jsonb,p_priority integer)
returns public.pdf_export_jobs language plpgsql security invoker set search_path='' as $$
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
 select coalesce(enabled,true),
        greatest(1,least(500,coalesce(daily_limit,15))),
        greatest(1,least(100,coalesce(hourly_limit,5))),
        coalesce(admin_unlimited,true)
 into cfg_enabled,cfg_daily,cfg_hourly,cfg_admin_unlimited
 from public.pdf_export_config where id='default';
 if cfg_enabled is not true then raise exception 'PDF_DISABLED'; end if;
 if exists(select 1 from public.pdf_export_jobs where user_id=p_user and status in ('queued','preparing','compiling','storing') and expires_at>now()) then raise exception 'PDF_ACTIVE_JOB'; end if;
 if not (cfg_admin_unlimited and p_priority>0) then
  if (select count(*) from public.pdf_export_jobs where user_id=p_user and created_at>now()-interval '1 hour')>=cfg_hourly then raise exception 'PDF_HOURLY_LIMIT'; end if;
  day_start := date_trunc('day',now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai';
  if (select count(*) from public.pdf_export_jobs where user_id=p_user and created_at>=day_start)>=cfg_daily then raise exception 'PDF_DAILY_LIMIT'; end if;
 end if;
 insert into public.pdf_export_jobs(user_id,request_key,payload,priority) values(p_user,p_key,p_payload,p_priority) returning * into j;
 return j;
end $$;
create or replace function public.pdf_export_claim()
returns setof public.pdf_export_jobs language plpgsql security invoker set search_path='' as $
declare
 picked uuid;
 capacity_limit integer;
begin
 perform pg_advisory_xact_lock(748309112);
 update public.pdf_export_jobs set status='failed',error='任务超时，请重新生成',updated_at=now() where status in ('queued','preparing','compiling','storing') and (expires_at<=now() or (attempts>=3 and lease_until<now()));
 update public.pdf_export_jobs set status='queued',lease_token=null,lease_until=null,updated_at=now() where status in ('preparing','compiling','storing') and lease_until<now() and attempts<3;
 select greatest(2,coalesce(sum(capacity),0)::integer) into capacity_limit
   from public.pdf_worker_nodes
  where kind='persistent' and updated_at>now()-interval '45 seconds';
 if (select count(*) from public.pdf_export_jobs where status in ('preparing','compiling','storing') and lease_until>now())>=capacity_limit then return; end if;
 select id into picked from public.pdf_export_jobs where status='queued' and expires_at>now() order by (priority + floor(extract(epoch from(now()-created_at))/600)) desc,created_at,id for update skip locked limit 1;
 if picked is null then return; end if;
 return query update public.pdf_export_jobs set status='preparing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes',updated_at=now() where id=picked returning *;
end $;
revoke all on function public.pdf_export_enqueue(uuid,uuid,jsonb,integer) from public,anon,authenticated;
revoke all on function public.pdf_export_claim() from public,anon,authenticated;
grant execute on function public.pdf_export_enqueue(uuid,uuid,jsonb,integer) to service_role;
grant execute on function public.pdf_export_claim() to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('exam-pdfs','exam-pdfs',false,20971520,array['application/pdf']) on conflict(id) do nothing;


create table if not exists public.pdf_worker_nodes (
 id text primary key,
 kind text not null default 'persistent' check(kind in ('persistent','scheduled')),
 capacity integer not null check(capacity between 1 and 32),
 active integer not null default 0 check(active >= 0 and active <= capacity),
 updated_at timestamptz not null default now()
);
alter table public.pdf_worker_nodes enable row level security;
revoke all on public.pdf_worker_nodes from public,anon,authenticated;
grant all on public.pdf_worker_nodes to service_role;
create index if not exists pdf_worker_nodes_fresh on public.pdf_worker_nodes(updated_at desc);


create table if not exists public.pdf_worker_tokens (
 id text primary key,
 token_hash text not null unique,
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 last_used_at timestamptz
);
alter table public.pdf_worker_tokens enable row level security;
revoke all on public.pdf_worker_tokens from public,anon,authenticated;
grant all on public.pdf_worker_tokens to service_role;


alter table public.pdf_worker_tokens
 drop constraint if exists pdf_worker_tokens_hash_format;
alter table public.pdf_worker_tokens
 add constraint pdf_worker_tokens_hash_format
 check (token_hash ~ '^[0-9a-f]{64}$');

drop policy if exists "pdf_worker_nodes_deny_client_access" on public.pdf_worker_nodes;
create policy "pdf_worker_nodes_deny_client_access"
on public.pdf_worker_nodes
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "pdf_worker_tokens_deny_client_access" on public.pdf_worker_tokens;
create policy "pdf_worker_tokens_deny_client_access"
on public.pdf_worker_tokens
for all
to anon, authenticated
using (false)
with check (false);
