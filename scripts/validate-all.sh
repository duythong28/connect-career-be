#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

echo "[validate-all] Node service checks"
"$ROOT_DIR/scripts/ci-node.sh"

echo "[validate-all] Python service checks"
"$ROOT_DIR/scripts/ci-python.sh"

echo "[validate-all] All checks passed"

