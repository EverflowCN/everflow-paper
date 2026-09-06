# Isolated browser QA

Run the bundle builder from the repository root, then `node backend/focuspomo/qa/prepare.mjs`. The generated harness uses an empty in-memory state in the same sandboxed srcdoc iframe as production, at 390 × 844. It has no account token or cloud writes. It is outside `site/` and is never deployed to Pages.

Use the supervised preview with this directory as root. Test starting, pausing, finishing, tags and page navigation. Regenerate after bundle changes and reload. No real account save or iOS background guarantees are implied by this harness.
