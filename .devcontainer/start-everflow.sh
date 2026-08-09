#!/usr/bin/env bash
set -euo pipefail

cd "${CODESPACE_VSCODE_FOLDER:-$PWD}"
PORT="${PORT:-8787}"
SERVER="dist/apps/api/src/server.js"

if [ ! -f package.json ]; then
  echo "[Everflow] package.json missing; bootstrap has not completed."
  exit 1
fi

# A Codespace working tree does not automatically follow origin/main. Fetch the
# latest development-only dashboard patch without resetting or overwriting any
# user files, then execute it directly from /tmp. Fall back to the local patch
# when the remote fetch is unavailable.
PATCH_RUNNER=".devcontainer/patch-codespaces-auth.js"
if git fetch -q origin main 2>/dev/null && git show origin/main:.devcontainer/patch-codespaces-auth.js > /tmp/everflow-codespaces-patch.js 2>/dev/null; then
  PATCH_RUNNER="/tmp/everflow-codespaces-patch.js"
  echo "[Everflow] Using latest Codespaces dashboard patch from origin/main."
fi
if [ -f "$PATCH_RUNNER" ]; then
  node "$PATCH_RUNNER"
fi

SITE_JS="apps/web/static/site/site.js"
if [ ! -f "$SITE_JS" ] || ! grep -q 'function pageHead(' "$SITE_JS"; then
  echo "[Everflow] Dashboard patch verification failed: pageHead() is missing."
  exit 1
fi
PATCH_VERSION="$(grep -o "everflowCodespacesPatchVersion='[^']*'" "$SITE_JS" | head -1 | cut -d\' -f2 || true)"
SITE_HASH="$(sha256sum "$SITE_JS" | awk '{print $1}' | cut -c1-12)"
echo "[Everflow] Dashboard patch version: ${PATCH_VERSION:-legacy}; site.js sha256:${SITE_HASH}"

# On a fresh Codespace bootstrap already builds the project once. Do not invoke
# `npm run api` here because that script runs `npm run build` again and can keep
# port 8787 unavailable for a long time. Only build when the compiled server is
# genuinely missing.
if [ ! -f "$SERVER" ]; then
  echo "[Everflow] Compiled API missing; building once..."
  npm run build
fi

pkill -f "$SERVER" 2>/dev/null || true

nohup env \
  EVERFLOW_PERSISTENCE="${EVERFLOW_PERSISTENCE:-file}" \
  EVERFLOW_JOB_DRIVER="${EVERFLOW_JOB_DRIVER:-memory}" \
  EVERFLOW_OBJECT_STORE="${EVERFLOW_OBJECT_STORE:-local}" \
  EVERFLOW_COMPILE_SANDBOX="${EVERFLOW_COMPILE_SANDBOX:-host}" \
  PORT="$PORT" \
  node "$SERVER" >/tmp/everflow-api.log 2>&1 &

for i in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/tmp/everflow-health.json 2>/dev/null; then
    echo "[Everflow] API ready on port ${PORT}"
    cat /tmp/everflow-health.json
    exit 0
  fi
  sleep 1
done

echo "[Everflow] API did not become ready. Last log lines:"
tail -120 /tmp/everflow-api.log || true
exit 1
