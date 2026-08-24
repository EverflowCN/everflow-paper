# Everflow Supabase hosted-only settings

These settings are intentionally **not** committed as live Supabase configuration and cannot be changed by the static frontend itself. The matching HTML templates are kept in this repository so the hosted Dashboard can be configured consistently.

## 1. Six-digit email OTP template

In Supabase Dashboard open **Authentication → Email Templates → Magic Link** and replace the body with the content of:

`supabase/templates/magic-link-otp.html`

The important variable is `{{ .Token }}`. Supabase sends a six-digit OTP when this variable is present; using `{{ .ConfirmationURL }}` sends a Magic Link instead.

For a brand-new account, Supabase may use **Confirm signup** rather than Magic Link. That hosted template must also contain `{{ .Token }}` if new-user signup should show a six-digit code instead of a confirmation link.

## 2. Six-digit password reset template

The account page implements password recovery as:

`邮箱 → 6 位重置验证码 → 设置新密码`

In Supabase Dashboard open **Authentication → Email Templates → Reset Password / Recovery** (the exact label may appear as “Reset Password”) and set the body to:

`supabase/templates/recovery-otp.html`

Recommended subject:

`{{ .Token }} 是你的 Everflow 密码重置验证码`

The recovery template must contain `{{ .Token }}` and should not contain `{{ .ConfirmationURL }}`. The frontend verifies this code with `verifyOtp(..., type: 'recovery')`, then calls `updateUser({ password })`. The old recovery-link flow remains compatible as a fallback for previously sent emails.
