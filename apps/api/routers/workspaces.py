"""Workspaces + Projects CRUD router."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from packages.database.core import get_db
from packages.core.schemas import new_id
from datetime import datetime

router = APIRouter()


class CreateWorkspace(BaseModel):
    name: str


class CreateProject(BaseModel):
    name: str
    question: str = ""


@router.post("")
def create_workspace(body: CreateWorkspace):
    ws_id = new_id("ws")
    conn = get_db()
    conn.execute(
        "INSERT INTO workspaces (id, name) VALUES (?, ?)",
        (ws_id, body.name)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM workspaces WHERE id=?", (ws_id,)).fetchone()
    conn.close()
    return {"id": row["id"], "name": row["name"], "created_at": row["created_at"]}


@router.get("")
def list_workspaces():
    conn = get_db()
    rows = conn.execute("SELECT * FROM workspaces ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{ws_id}")
def get_workspace(ws_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM workspaces WHERE id=?", (ws_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Workspace not found")
    projects = conn.execute(
        "SELECT * FROM projects WHERE workspace_id=? ORDER BY created_at DESC", (ws_id,)
    ).fetchall()
    conn.close()
    return {**dict(row), "projects": [dict(p) for p in projects]}


@router.post("/{ws_id}/projects")
def create_project(ws_id: str, body: CreateProject):
    conn = get_db()
    ws = conn.execute("SELECT id FROM workspaces WHERE id=?", (ws_id,)).fetchone()
    if not ws:
        conn.close()
        raise HTTPException(404, "Workspace not found")
    proj_id = new_id("proj")
    conn.execute(
        "INSERT INTO projects (id, workspace_id, name, question) VALUES (?, ?, ?, ?)",
        (proj_id, ws_id, body.name, body.question)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM projects WHERE id=?", (proj_id,)).fetchone()
    conn.close()
    return dict(row)


@router.get("/{ws_id}/projects")
def list_projects(ws_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM projects WHERE workspace_id=? ORDER BY created_at DESC", (ws_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{ws_id}/projects/{proj_id}")
def get_project(ws_id: str, proj_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM projects WHERE id=? AND workspace_id=?", (proj_id, ws_id)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Project not found")
    seeds = conn.execute("SELECT id, filename, created_at FROM seeds WHERE project_id=?", (proj_id,)).fetchall()
    runs = conn.execute("SELECT * FROM runs WHERE project_id=? ORDER BY started_at DESC LIMIT 10", (proj_id,)).fetchall()
    configs = conn.execute("SELECT * FROM configs WHERE project_id=? ORDER BY is_baseline DESC", (proj_id,)).fetchall()
    conn.close()
    return {
        **dict(row),
        "seeds": [dict(s) for s in seeds],
        "runs": [dict(r) for r in runs],
        "configs": [_parse_config(c) for c in configs],
    }


def _parse_config(row):
    d = dict(row)
    import json
    d["config"] = json.loads(d.pop("config_json", "{}"))
    return d
