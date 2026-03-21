"""Seed upload router."""

from fastapi import APIRouter, HTTPException, UploadFile, File
from db import get_db
from packages.core.schemas import new_id

router = APIRouter()


@router.post("/projects/{proj_id}/seeds")
async def upload_seed(proj_id: str, file: UploadFile = File(...)):
    conn = get_db()
    proj = conn.execute("SELECT id FROM projects WHERE id=?", (proj_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(404, "Project not found")

    content_bytes = await file.read()
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = content_bytes.decode("latin-1")

    seed_id = new_id("seed")
    conn.execute(
        "INSERT INTO seeds (id, project_id, filename, content) VALUES (?, ?, ?, ?)",
        (seed_id, proj_id, file.filename or "upload.txt", content)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM seeds WHERE id=?", (seed_id,)).fetchone()
    conn.close()
    return dict(row)


@router.get("/projects/{proj_id}/seeds")
def list_seeds(proj_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT id, project_id, filename, created_at FROM seeds WHERE project_id=? ORDER BY created_at DESC",
        (proj_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/seeds/{seed_id}")
def get_seed(seed_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM seeds WHERE id=?", (seed_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Seed not found")
    return dict(row)
