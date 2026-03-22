"""ResearchForge — FastAPI application entry point."""

import sys
from pathlib import Path

# Add project root to path so packages/ is importable
_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from packages.database.core import init_db
from routers import workspaces, seeds, runs, reports, compare, app_settings, tools

app = FastAPI(
    title="ResearchForge API",
    description="Local-first self-improving research platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(workspaces.router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(seeds.router, prefix="/api", tags=["seeds"])
app.include_router(runs.router, prefix="/api", tags=["runs"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(compare.router, prefix="/api", tags=["compare"])
app.include_router(app_settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(tools.router, prefix="/api/tools", tags=["tools"])


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": "ResearchForge API"}
