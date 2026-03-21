#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== ResearchForge Dev ==="

# Kill background processes on exit
trap 'kill 0' EXIT

# Load env
if [ -f "$ROOT/.env" ]; then
    export $(grep -v '^#' "$ROOT/.env" | xargs)
fi

# Start backend
echo "→ Starting API server on :${API_PORT:-8000}..."
cd "$ROOT/apps/api"
source .venv/bin/activate 2>/dev/null || true
PYTHONPATH="$ROOT" uvicorn main:app --host ${API_HOST:-0.0.0.0} --port ${API_PORT:-8000} --reload &

# Start frontend
echo "→ Starting frontend on :3000..."
cd "$ROOT/apps/web"
npm run dev &

wait
