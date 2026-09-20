# exam-A4 online export

This extends the existing `/relax/` builder and Vercel backend. Only question pages are generated. `compact` uses the template's 0.45-baseline gap; `spacious` reserves 25 mm after each question. The question core and exam-zh class are taken from the user's 85-paper template (itself based on the approved mixed-A4 template); upstream LPPL headers are retained. No covers, TOC, print pages or fixed total-page numbers are included. XeLaTeX runs twice for actual page totals.

## Production flow

Authenticated member browser → `https://api.evera.top/api/pdf/export` → Supabase `pdf-export` Edge Function → private durable `pdf_export_jobs` queue → persistent XeLaTeX worker → private `exam-pdfs` bucket → 10-minute signed download URL.

The primary compiler is the Railway service `Everflow PDF Worker / pdf-worker`, built from `ghcr.io/everflowcn/everflow-pdf-worker:latest`. It keeps XeLaTeX, CJK fonts, Pillow and CairoSVG warm and polls the queue every 1.5 seconds with capacity 2. A `/healthz` endpoint is configured for Railway health checks.

GitHub Actions `.github/workflows/pdf-export-worker.yml` remains as a durable fallback. It now uses the same prebuilt GHCR image instead of installing TeX Live on every run. Scheduled fallback polling remains every five minutes.

## Access and queue policy

PDF export requires both a valid Supabase login and an active `member` or `pro` membership. The Edge Function enforces this server-side; the browser check is only UX.

Regular users receive only their own task status, queue position and worker state. Manager priority is derived from verified `app_metadata.role` and is returned only to manager accounts. Request UUIDs make retries idempotent. Each user is limited to one active export. Daily/hourly quotas are configured by the Owner in the PDF compiler workspace and enforced atomically in Postgres; defaults are 15/day and 5/hour with a UTC+8 midnight reset. Owner/Admin accounts can be configured to bypass count quotas. Jobs expire after 24 hours.

Claims are atomic and lease based. Persistent workers report heartbeats to `pdf_worker_nodes`; the UI uses live node capacity to choose a fast ETA when a persistent node is healthy, otherwise it automatically falls back to the scheduled-worker ETA.

Persistent worker authentication uses a dedicated opaque token. Only its SHA-256 hash is stored in `pdf_worker_tokens`; the plaintext token exists only in the worker runtime environment. GitHub Actions continues to authenticate through GitHub OIDC. No Supabase service-role key is stored in either worker.

## Deployment

- UI: GitHub Pages
- API proxy: Vercel project `everflow-blog-admin-api`
- Auth / queue / signed URLs / worker control plane: Supabase
- Primary compiler: Railway persistent worker
- Fallback compiler: GitHub Actions
- Worker image: GHCR `ghcr.io/everflowcn/everflow-pdf-worker:latest`

The persistent worker files are:

- `tools/pdf/Dockerfile.worker`
- `tools/pdf/worker_daemon.py`
- `tools/pdf/docker-compose.worker.yml`
- `.github/workflows/pdf-worker-image.yml`

## Verification

The renderer reads canonical published question records plus server-side correction rows. Browser requests cannot supply arbitrary question text, assets, answers or TeX. Asset hosts and paths are restricted, redirects are refused, TeX runs with `-no-shell-escape`, and mathematical commands/environments are allowlisted.

On 2026-09-20 a 40-question Relax1000 smoke export was inserted into the production queue and processed by the Railway persistent worker. It entered `compiling` about 1.8 seconds after enqueue and reached `completed` in 8.585 seconds total. The private test PDF and test job were then removed through the normal expiry cleanup path.

The GitHub Actions prebuilt-image fallback was also verified successfully. A validation run completed in about 51 seconds total; pulling the image took about 29 seconds, replacing the previous cold TeX installation step that alone took roughly 94 seconds.
