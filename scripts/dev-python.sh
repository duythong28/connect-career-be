#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SVC_DIR="$ROOT_DIR/services/ai-service"
VENV_DIR="$SVC_DIR/.venv"

cd "$SVC_DIR"

if [ ! -d "$VENV_DIR" ]; then
  echo "[dev-python] Creating venv at $VENV_DIR"
  python -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
echo "[dev-python] Python: $(python --version)"
echo "[dev-python] Installing deps"
pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt

PORT=
PORT=${PORT:-8000}
echo "[dev-python] Starting FastAPI on :$PORT with reload"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload

