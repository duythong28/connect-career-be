#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SVC_DIR="$ROOT_DIR/services/connect-career-be"

cd "$SVC_DIR"
echo "[dev-node] Installing deps (if needed)"
npm install

echo "[dev-node] Starting NestJS in watch mode"
npm run start:dev

