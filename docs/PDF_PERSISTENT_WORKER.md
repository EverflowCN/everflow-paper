# Everflow persistent PDF worker deployment

The production PDF queue already works without this service. GitHub Actions remains the durable fallback. This document covers the low-latency persistent worker only.

## Runtime contract

Use the existing image:

```
ghcr.io/everflowcn/everflow-pdf-worker:latest
```

The image contains XeLaTeX, the required Chinese/math fonts, Pillow, CairoSVG, and the canonical Everflow renderer.

Start command:

```
python3 tools/pdf/worker_daemon.py
```

Required environment variables:

| Variable | Value |
| --- | --- |
| `EVERFLOW_PDF_WORKER_SECRET` | Plaintext worker token whose SHA-256 hash exists as an enabled row in `public.pdf_worker_tokens`. Never commit it. |
| `EVERFLOW_PDF_ENDPOINT` | `https://xzodetdohinktagxuwhs.supabase.co/functions/v1/pdf-export` |
| `PDF_WORKER_CAPACITY` | `2` initially |
| `PDF_WORKER_POLL_SECONDS` | `1.5` |
| `PDF_WORKER_NODE_ID` | Stable unique node name, e.g. `railway-primary` |
| `PORT` | Supplied by the hosting platform |

Health check:

```
GET /healthz
```

A healthy response is JSON with `ok: true`, `capacity`, `active`, and uptime information.

## Security model

- The plaintext worker token exists only in the worker host environment.
- Supabase stores only SHA-256 token hashes in `public.pdf_worker_tokens`.
- Worker tables have RLS enabled and explicit deny-all policies for `anon` and `authenticated`.
- Worker requests use `X-Everflow-Worker-Key`.
- GitHub Actions continues to authenticate separately with GitHub OIDC.
- The persistent worker never receives the Supabase service-role key.
- Browser clients never receive queue leases, worker tokens, priority values, or storage credentials.

## Scheduling and fallback

The daemon polls the durable queue every 1.5 seconds and sends a heartbeat every 10 seconds.

If a persistent heartbeat is fresh (within 45 seconds), the API reports `workers.mode = persistent` and returns the fast ETA model. If the node disappears, the UI automatically falls back to the scheduled-worker ETA.

Keep `.github/workflows/pdf-export-worker.yml` enabled as a fallback. It checks the same durable queue every five minutes and now uses the prebuilt GHCR image instead of installing TeX Live on every run.

## Initial sizing

Start with one node:

- capacity: 2 concurrent PDF jobs
- 2 vCPU recommended
- 2–4 GB RAM recommended
- region near Supabase `ap-southeast-1` when the host provides a Singapore/Southeast Asia option

Do not increase concurrency until real CPU/RAM and XeLaTeX P95 data is collected.

## Production verification

After deployment:

1. Confirm `/healthz` is healthy.
2. Confirm `public.pdf_worker_nodes` has a fresh row for the node.
3. Confirm `public.pdf_worker_tokens.last_used_at` updates.
4. Submit one member-owned compact 40-question paper.
5. Confirm the API returns `workers.mode = persistent`.
6. Confirm queue → compiling → storing → completed without GitHub Actions claiming the job.
7. Record end-to-end duration and compile duration.
8. Repeat with spacious layout.
9. Disable the persistent node once and verify GitHub Actions still processes a queued job.

## Measured fallback baseline (2026-09-20)

A controlled 40-question production compile using the prebuilt-image GitHub fallback measured:

- runner setup + checkout + queue check: about 5 seconds
- GHCR image pull: about 20 seconds
- renderer verification (only on renderer-changing/manual runs): about 10 seconds
- actual 40-question compile + upload: about 12 seconds
- complete manual test attempt: about 50 seconds

Normal scheduled jobs skip renderer verification. The remaining large fallback delay is the GitHub cron start window, not XeLaTeX itself.

## Rollback

No database rollback is required if the persistent worker misbehaves:

1. stop/scale the persistent service to zero;
2. its heartbeat becomes stale after 45 seconds;
3. the API switches ETA back to scheduled mode;
4. GitHub Actions continues consuming the same queue.

Do not delete `pdf_export_jobs`, `exam-pdfs`, or the GitHub fallback workflow during the initial rollout.
