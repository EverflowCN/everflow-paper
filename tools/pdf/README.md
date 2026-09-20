# exam-A4 online export

This extends the existing `/relax/` builder and Vercel backend. Only question pages are generated. `compact` uses the template's 0.45-baseline gap; `spacious` reserves 25 mm after each question. The question core and exam-zh class are taken from the user's 85-paper template (itself based on the approved mixed-A4 template); upstream LPPL headers are retained. No covers, TOC, print pages or fixed total-page numbers are included. XeLaTeX runs twice for actual page totals.

Flow: authenticated browser → `/api/pdf/export` → Supabase `pdf-export` → private durable queue → GitHub Actions XeLaTeX worker → private `exam-pdfs` bucket → 10-minute signed download URL. Jobs expire after 24 hours. Regular users receive only their own status; priority is computed from verified app metadata and omitted from ordinary responses. Request UUIDs make retries idempotent. Claims are atomic, use bounded leases, allow two workers and age waiting jobs to avoid indefinite starvation. A user's single active task and 20/hour limit bound abuse.

The worker trusts only GitHub OIDC tokens issued for this repository's main-branch `pdf-export-worker.yml`, and never stores a cloud service key in GitHub. The Edge Function checks Supabase Auth tokens for users, and validates OIDC signature/issuer/audience/repository/ref/workflow for workers, so gateway JWT verification is intentionally disabled there.

## Deployment

Run `supabase/sql/pdf-export.sql` in the existing Supabase project; deploy `supabase/functions/pdf-export`. Vercel uses the existing `backend` root and GitHub integration. The existing Pages workflow publishes the UI. No new project is required.

Actions checks every five minutes; GitHub may delay scheduled runs. This is a durable baseline, **not a low-latency or high-throughput production worker**. Cold TeX package installation adds startup time. `workflow_dispatch` can trigger a run immediately. If sub-minute startup is required, replace scheduling with a provisioned always-on worker (and its narrowly scoped authentication); don't fake progress or run a worker as a transient development process. The no-job check avoids TeX installation during idle scheduled runs.

## Verification

`python3 tools/pdf/test_render.py` requires XeLaTeX, CJK packages, TeX Gyre math fonts and Pillow. CI uploads two body-only verification PDFs. The worker reads canonical published question records plus server-side correction rows; request bodies cannot supply question text, assets, answers or TeX. Asset hosts/paths are restricted and redirects rejected. TeX runs without shell escape; mathematical commands/environments are allowlisted. Missing images fail the job instead of silently omitting diagrams.

Remaining operational considerations: provision a faster worker before promising rapid export; add retention cleanup for expired private PDFs if export volume grows. Database expiration currently revokes job download retrieval, but objects remain private until cleaned up.
