# Everflow Supabase hosted-only settings

These two values are intentionally **not** committed to GitHub and cannot be configured by the static frontend.

## 1. Six-digit email OTP template

In Supabase Dashboard open **Authentication → Email Templates → Magic Link** and replace the body with the content of:

`supabase/templates/magic-link-otp.html`

The important variable is `{{ .Token }}`. Supabase sends a six-digit OTP when this variable is present; using `{{ .ConfirmationURL }}` sends a Magic Link instead.

## 2. Workspace → 408 update manual trigger

The `oxygen-sync` Edge Function can read public workflow status without a GitHub token. Manual `workflow_dispatch` and failed-run retry require an Edge Function secret named:

`EVERFLOW_GITHUB_TOKEN`

Create a fine-grained GitHub token with access limited to `EverflowCN/everflow-paper` and the minimum Actions/Contents permissions needed to dispatch/re-run the existing workflow, then add it **directly in Supabase Edge Function Secrets**. Never put the token in `site/`, `localStorage`, a browser bundle, or GitHub source.

When this secret is absent, Workspace should show the GitHub integration as optional/read-only; it must not mark Supabase/Auth/Database as unhealthy.