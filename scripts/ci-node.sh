#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SVC_DIR="$ROOT_DIR/services/connect-career-be"

cd "$SVC_DIR"
echo "[ci-node] Installing deps"
npm ci

echo "[ci-node] Lint"
npm run lint

echo "[ci-node] Unit tests"
npm test -- --passWithNoTests

echo "[ci-node] E2E tests"
npm run test:e2e

echo "[ci-node] Build"
npm run build

echo "[ci-node] Done"

