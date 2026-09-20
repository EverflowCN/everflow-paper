drop policy if exists "pdf_export_jobs_deny_client_access" on public.pdf_export_jobs;
create policy "pdf_export_jobs_deny_client_access"
on public.pdf_export_jobs
for all
to anon, authenticated
using (false)
with check (false);
