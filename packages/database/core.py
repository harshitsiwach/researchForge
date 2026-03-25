"""ResearchForge local SQLite database layer."""

import sqlite3
import json
import os
from pathlib import Path
from packages.core.config import settings

# This assumes the settings.WORKSPACES_DIR is set correctly
DB_PATH = Path(settings.WORKSPACES_DIR) / "researchforge.db"


def get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        name TEXT NOT NULL,
        question TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS seeds (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        filename TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS configs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        label TEXT DEFAULT 'default',
        config_json TEXT NOT NULL DEFAULT '{}',
        is_baseline INTEGER DEFAULT 0,
        promoted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        config_id TEXT NOT NULL REFERENCES configs(id),
        mode TEXT DEFAULT 'explore',
        status TEXT DEFAULT 'pending',
        started_at TEXT,
        finished_at TEXT,
        log TEXT DEFAULT '',
        events_jsonl TEXT DEFAULT '',
        error TEXT
    );
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        title TEXT DEFAULT '',
        content_md TEXT DEFAULT '',
        scenarios_json TEXT DEFAULT '[]',
        eval_score_json TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings_kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auto_research_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        topic TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        working_draft_md TEXT DEFAULT '',
        log TEXT DEFAULT '',
        events_jsonl TEXT DEFAULT '',
        started_at TEXT,
        finished_at TEXT,
        error TEXT
    );
    """)
    conn.commit()
    conn.close()
