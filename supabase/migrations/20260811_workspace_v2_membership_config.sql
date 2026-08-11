-- Everflow Owner Workspace v2
-- Allow only authenticated Owner accounts to update the public membership promotion configuration.
-- Public/regular users retain read-only access through the existing public-read policy.

drop policy if exists "membership_config_owner_update" on public.membership_config;
create policy "membership_config_owner_update"
on public.membership_config for update
to authenticated
using ((select public.is_everflow_owner()))
with check ((select public.is_everflow_owner()));
