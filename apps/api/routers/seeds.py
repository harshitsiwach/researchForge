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
    from packages.tools.registry import get_enabled_tools, execute_tool
    from packages.core.json_repair import safe_parse_json

    tools = get_enabled_tools()
    context_addition = ""

    if tools:
        tools_desc = "\n".join([f"- {t.id}: {t.description}" for t in tools])
        planning_prompt = f"""You are an expert research planner.
The user wants to research the following question: "{question}"

You have access to the following tools to gather factual background data:
{tools_desc}

Decide what 1-3 tool calls would be best to query facts before writing the background document.
Respond in valid JSON only:
{{
  "tool_calls": [
    {{"tool_id": "web_search", "query": "exact search term"}},
    {{"tool_id": "wikipedia", "query": "wiki topic"}}
  ]
}}"""
        try:
            planning_resp = chat([{"role": "user", "content": planning_prompt}], temperature=0.3)
            decision = safe_parse_json(planning_resp, fallback={"tool_calls": []})
            tool_calls = decision.get("tool_calls", [])
            
            findings = []
            if isinstance(tool_calls, list):
                for call in tool_calls[:3]:  # Execute up to 3 tool calls
                    tid = call.get("tool_id")
                    tq = call.get("query")
                    if tid and tq:
                        try:
                            # Execute synchronously
                            result = execute_tool(tid, tq)
                            findings.append(f"--- Factual Data from {tid} ('{tq}') ---\n{result}\n")
                        except Exception:
                            pass
            
            if findings:
                context_addition = "Here is factual data gathered from external sources:\n" + "\n".join(findings) + "\n\nUse this data to precisely ground your background document."
        except Exception:
            pass # Fall back to no outer context

    prompt = f"""You are an expert research assistant.
The user is starting a research project on the following question:
"{question}"

{context_addition}

Please write a comprehensive, foundational background document (approx 500-800 words) that outlines the key context, current state of the art, major debates, and core concepts related to this question. 
This document will be used as the "seed" material for multi-agent simulation scenarios. Ensure you include citations or explicit references to the factual data if provided.
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
