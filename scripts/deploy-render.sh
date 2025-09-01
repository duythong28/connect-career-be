#!/usr/bin/env bash
set -euo pipefail

# Trigger a Render deploy via Deploy Hook URL.
# Usage:
#   scripts/deploy-render.sh <deploy_hook_url>
# or set env var RENDER_DEPLOY_HOOK_URL / RENDER_AI_DEPLOY_HOOK_URL

URL="${1:-}";
if [ -z "$URL" ]; then
  URL="${RENDER_DEPLOY_HOOK_URL:-${RENDER_AI_DEPLOY_HOOK_URL:-}}"
fi

if [ -z "$URL" ]; then
  echo "Usage: scripts/deploy-render.sh <deploy_hook_url>"
  echo "Or set RENDER_DEPLOY_HOOK_URL / RENDER_AI_DEPLOY_HOOK_URL"
  exit 2
fi

echo "[deploy-render] POST $URL"
code=$(curl -sS -X POST -H "Accept: application/json" "$URL" -w "%{http_code}" -o /tmp/render_out || true)
echo "[deploy-render] Response code: $code"
if [ "$code" -lt 200 ] || [ "$code" -ge 400 ]; then
  echo "[deploy-render] Failed. Body:" && cat /tmp/render_out || true
  exit 1
fi
echo "[deploy-render] Deploy triggered successfully."

