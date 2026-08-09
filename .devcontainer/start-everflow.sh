#!/usr/bin/env bash
set -euo pipefail
cd "${CODESPACE_VSCODE_FOLDER:-$PWD}"
if [ ! -f package.json ]; then
  echo "[Everflow] package.json missing; bootstrap has not completed."
  exit 0
fi
pkill -f 'dist/apps/api/src/server.js' 2>/dev/null || true
nohup env \
  EVERFLOW_PERSISTENCE="${EVERFLOW_PERSISTENCE:-file}" \
  EVERFLOW_JOB_DRIVER="${EVERFLOW_JOB_DRIVER:-memory}" \
  EVERFLOW_OBJECT_STORE="${EVERFLOW_OBJECT_STORE:-local}" \
  EVERFLOW_COMPILE_SANDBOX="${EVERFLOW_COMPILE_SANDBOX:-host}" \
  PORT="${PORT:-8787}" \
  npm run api >/tmp/everflow-api.log 2>&1 &
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT:-8787}/health" >/tmp/everflow-health.json 2>/dev/null; then
    echo "[Everflow] API ready on port ${PORT:-8787}"
    cat /tmp/everflow-health.json
    exit 0
  fi
  sleep 1
done
echo "[Everflow] API did not become ready. Last log lines:"
tail -80 /tmp/everflow-api.log || true
exit 1
