"""Auto-Research job creation and monitoring router."""

from __future__ import annotations
import json
import threading
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import asyncio
from pydantic import BaseModel

from packages.database.core import get_db
from packages.core.schemas import new_id
from packages.research_loop.auto_researcher import AutoResearcher

router = APIRouter()

class CreateAutoResearch(BaseModel):
    topic: str

@router.post("/projects/{proj_id}/auto_research")
def create_auto_research(proj_id: str, body: CreateAutoResearch):
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id=?", (proj_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(404, "Project not found")

    job_id = new_id("arj")
    conn.execute(
        "INSERT INTO auto_research_jobs (id, project_id, topic, status, started_at) VALUES (?, ?, ?, ?, ?)",
        (job_id, proj_id, body.topic, "running", datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

    _launch_job(job_id, proj_id, body.topic)

    return {"job_id": job_id, "status": "running"}

def _launch_job(job_id: str, proj_id: str, topic: str):
    def _run():
        log_lines = []
        events_jsonl = []

        def check_stop_cb():
            conn = get_db()
            row = conn.execute("SELECT status FROM auto_research_jobs WHERE id=?", (job_id,)).fetchone()
            conn.close()
            return row and row["status"] in ["stopped", "failed"]

        def log_cb(msg):
            log_lines.append(msg)
            conn = get_db()
            conn.execute("UPDATE auto_research_jobs SET log=? WHERE id=?", ("\n".join(log_lines), job_id))
            conn.commit()
            conn.close()

        def event_cb(evt_type, data):
            # Normal Simulation events have "eventId", "type", etc.
            # We'll mimic that structure so the frontend can reuse components if needed.
            evt = {
                "eventId": new_id("evt"),
                "timestamp": datetime.utcnow().timestamp(),
                "jobId": job_id,
                "type": evt_type,
                "source": "auto_researcher",
                **data
            }
            events_jsonl.append(json.dumps(evt))
            conn = get_db()
            conn.execute(
                "UPDATE auto_research_jobs SET events_jsonl=? WHERE id=?", 
                ("\n".join(events_jsonl), job_id)
            )
            
            # If the event updates the working draft, save it directly
            if evt_type == "draft_updated" and "draft" in data:
                conn.execute(
                    "UPDATE auto_research_jobs SET working_draft_md=? WHERE id=?",
                    (data["draft"], job_id)
                )

            conn.commit()
            conn.close()

        try:
            researcher = AutoResearcher(
                job_id=job_id, 
                project_id=proj_id, 
                log_cb=log_cb, 
                event_cb=event_cb, 
                check_stop_cb=check_stop_cb
            )
            
            final_draft = researcher.run(topic)

            if check_stop_cb():
                status = "stopped"
                log_lines.append("✓ Job stopped")
            else:
                status = "completed"
                log_lines.append("✓ Job complete")

            conn = get_db()
            conn.execute(
                "UPDATE auto_research_jobs SET status=?, finished_at=?, log=?, working_draft_md=? WHERE id=?",
                (status, datetime.utcnow().isoformat(), "\n".join(log_lines), final_draft, job_id)
            )
            conn.commit()
            conn.close()

        except Exception as e:
            log_lines.append(f"✗ Error: {str(e)}")
            conn = get_db()
            conn.execute(
                "UPDATE auto_research_jobs SET status=?, finished_at=?, log=?, error=? WHERE id=?",
                ("failed", datetime.utcnow().isoformat(), "\n".join(log_lines), str(e), job_id)
            )
            conn.commit()
            conn.close()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()


@router.get("/auto_research/{job_id}")
def get_job(job_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM auto_research_jobs WHERE id=?", (job_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Job not found")
    return dict(row)


@router.get("/auto_research/{job_id}/events")
async def stream_job_events(job_id: str):
    """Stream structured events using Server-Sent Events (SSE)."""
    async def event_generator():
        last_count = 0
        while True:
            conn = get_db()
            row = conn.execute("SELECT status, events_jsonl FROM auto_research_jobs WHERE id=?", (job_id,)).fetchone()
            conn.close()
            
            if not row:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Job not found'})}\n\n"
                break
                
            events_str = row["events_jsonl"] or ""
            events = [line for line in events_str.split("\n") if line.strip()]
            
            for line in events[last_count:]:
                yield f"data: {line}\n\n"
            
            last_count = len(events)
            
            if row["status"] in ["completed", "failed", "stopped"]:
                yield f"data: {json.dumps({'type': 'stream_end', 'status': row['status']})}\n\n"
                break
                
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/projects/{proj_id}/auto_research")
def list_jobs(proj_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT id, project_id, topic, status, started_at, finished_at, error FROM auto_research_jobs "
        "WHERE project_id=? ORDER BY started_at DESC",
        (proj_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/auto_research/{job_id}/stop")
def stop_job(job_id: str):
    conn = get_db()
    conn.execute("UPDATE auto_research_jobs SET status='stopped' WHERE id=? AND status='running'", (job_id,))
    conn.commit()
    conn.close()
    return {"status": "stopping"}
