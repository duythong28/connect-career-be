#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SVC_DIR="$ROOT_DIR/services/ai-service"

cd "$SVC_DIR"
echo "[ci-python] Python: $(python --version 2>&1 || true)"
echo "[ci-python] Upgrade pip and install deps"
python -m pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt

echo "[ci-python] Lint (ruff)"
ruff check .

echo "[ci-python] Tests (pytest)"
pytest -q

echo "[ci-python] Done"

