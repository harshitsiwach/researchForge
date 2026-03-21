#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== ResearchForge Setup ==="
echo ""

# 1. Python backend
echo "→ Setting up Python backend..."
cd "$ROOT/apps/api"
python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "  ✓ Backend dependencies installed"

# 2. Node frontend
echo "→ Setting up frontend..."
cd "$ROOT/apps/web"
npm install --silent
echo "  ✓ Frontend dependencies installed"

# 3. Env file
if [ ! -f "$ROOT/.env" ]; then
    cp "$ROOT/.env.example" "$ROOT/.env"
    echo "  ✓ Created .env from .env.example — edit it with your LLM endpoint"
else
    echo "  ✓ .env already exists"
fi

# 4. Create workspace directory
mkdir -p "$ROOT/workspaces"

echo ""
echo "=== Setup complete ==="
echo "Run ./scripts/dev.sh to start"
