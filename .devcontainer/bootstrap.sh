#!/usr/bin/env bash
set -euo pipefail
cd "${CODESPACE_VSCODE_FOLDER:-$PWD}"
ARCHIVE="everflow-private-github-ready.zip"
if [ ! -f "$ARCHIVE" ]; then
  echo "[Everflow] Missing $ARCHIVE"
  exit 1
fi

echo "[Everflow] Expanding private source archive into Codespace workspace..."
unzip -oq "$ARCHIVE" -d . -x '.devcontainer/*' '.github/*'
rm -rf .runtime dist node_modules demo-output
rm -f .env

echo "[Everflow] Installing Node dependencies..."
npm install --no-audit --no-fund

echo "[Everflow] Building TypeScript..."
npm run build

echo "[Everflow] Codespace bootstrap complete."
