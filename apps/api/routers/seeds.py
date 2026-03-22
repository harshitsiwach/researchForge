"""Seed upload router."""

from fastapi import APIRouter, HTTPException, UploadFile, File
from packages.database.core import get_db
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


@router.post("/projects/{proj_id}/seeds/generate")
def generate_seed(proj_id: str):
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id=?", (proj_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(404, "Project not found")
        
    question = proj["question"]
    if not question:
        conn.close()
        raise HTTPException(400, "Project has no research question to base the seed on")

    from packages.core.llm import chat
    prompt = f"""You are an expert research assistant.
The user is starting a research project on the following question:
"{question}"

Please write a comprehensive, foundational background document (approx 500-800 words) that outlines the key context, current state of the art, major debates, and core concepts related to this question. 
This document will be used as the "seed" material for multi-agent simulation scenarios.
Format it in clean Markdown."""

    try:
        generated_content = chat([
            {"role": "system", "content": "You are a helpful and highly analytical research assistant."},
            {"role": "user", "content": prompt}
        ])
    except Exception as e:
        conn.close()
        raise HTTPException(500, f"LLM generation failed: {str(e)}")

    if not generated_content.strip():
        conn.close()
        raise HTTPException(500, "LLM returned an empty response")

    seed_id = new_id("seed")
    title = f"Auto-Generated Context: {question[:30]}..."
    
    conn.execute(
        "INSERT INTO seeds (id, project_id, filename, content) VALUES (?, ?, ?, ?)",
        (seed_id, proj_id, title, generated_content)
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
