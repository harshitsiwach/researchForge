"""Run creation, execution, and monitoring router."""

from __future__ import annotations
import json
import threading
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from packages.database.core import get_db
from packages.core.schemas import new_id, SimConfig, RunMode, RunStatus

router = APIRouter()


class CreateRun(BaseModel):
    config_id: Optional[str] = None
    mode: str = "explore"
    # Inline config overrides (used if config_id not provided)
    num_agents: int = 6
    num_rounds: int = 8
    debate_style: str = "structured"
    critique_strength: str = "medium"


@router.post("/projects/{proj_id}/runs")
def create_run(proj_id: str, body: CreateRun):
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id=?", (proj_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(404, "Project not found")

    question = proj["question"] or ""

    # Get or create config
    if body.config_id:
        cfg_row = conn.execute("SELECT * FROM configs WHERE id=?", (body.config_id,)).fetchone()
        if not cfg_row:
            conn.close()
            raise HTTPException(404, "Config not found")
        config_data = json.loads(cfg_row["config_json"])
        config_id = body.config_id
    else:
        config_id = new_id("cfg")
        config_data = {
            "num_agents": body.num_agents,
            "num_rounds": body.num_rounds,
            "debate_style": body.debate_style,
            "critique_strength": body.critique_strength,
            "report_template": "standard",
        }
        conn.execute(
            "INSERT INTO configs (id, project_id, label, config_json) VALUES (?, ?, ?, ?)",
            (config_id, proj_id, f"{body.mode} run", json.dumps(config_data))
        )
        conn.commit()

    run_id = new_id("run")
    conn.execute(
        "INSERT INTO runs (id, project_id, config_id, mode, status, started_at) VALUES (?, ?, ?, ?, ?, ?)",
        (run_id, proj_id, config_id, body.mode, "running", datetime.utcnow().isoformat())
    )
    conn.commit()

    # Gather seeds
    seeds = conn.execute("SELECT content FROM seeds WHERE project_id=?", (proj_id,)).fetchall()
    seed_texts = [s["content"] for s in seeds]
    conn.close()

    # Launch in background
    _launch_run(run_id, proj_id, config_id, config_data, question, seed_texts, body.mode)

    return {"run_id": run_id, "status": "running"}


def _launch_run(run_id, proj_id, config_id, config_data, question, seed_texts, mode):
    def _run():
        log_lines = []
        events_jsonl = []

        def log_cb(msg):
            log_lines.append(msg)
            conn = get_db()
            conn.execute("UPDATE runs SET log=? WHERE id=?", ("\n".join(log_lines), run_id))
            conn.commit()
            conn.close()

        def event_cb(evt: dict):
            import json
            events_jsonl.append(json.dumps(evt))
            conn = get_db()
            conn.execute("UPDATE runs SET events_jsonl=? WHERE id=?", ("\n".join(events_jsonl), run_id))
            conn.commit()
            conn.close()

        try:
            import json
            from packages.simulation.adapter import SimulationAdapter
            from packages.evaluation.scorer import Evaluator
            from packages.core.schemas import SimConfig
            from packages.tools.registry import get_enabled_tools, execute_tool
            from packages.tools.live_feed import LiveFeedManager

            # 1. Setup tool caller
            enabled_tools = get_enabled_tools()
            tool_caller = None
            if enabled_tools:
                tool_caller = {
                    "tools_info": [{"id": t.id, "description": t.description} for t in enabled_tools],
                    "execute": execute_tool,
                }

            # 2. Setup live feeds
            conn = get_db()
            feeds_row = conn.execute("SELECT value FROM settings_kv WHERE key=?", (f"feeds_{proj_id}",)).fetchone()
            conn.close()
            
            feed_sources = json.loads(feeds_row["value"]) if feeds_row and feeds_row["value"] else []
            live_feed = LiveFeedManager(question, sources=feed_sources) if feed_sources else None

            sim_config = SimConfig(
                id=config_id,
                project_id=proj_id,
                num_agents=config_data.get("num_agents", 6),
                num_rounds=config_data.get("num_rounds", 8),
                debate_style=config_data.get("debate_style", "structured"),
                critique_strength=config_data.get("critique_strength", "medium"),
                report_template=config_data.get("report_template", "standard"),
            )

            adapter = SimulationAdapter(sim_config)

            if not question:
                log_cb("Warning: No research question set. Using seed content as prompt.")
                q = "Analyze the provided seed materials and generate research scenarios."
            else:
                q = question

            result = adapter.run(
                q, 
                seed_texts, 
                log_callback=log_cb, 
                event_callback=event_cb,
                tool_caller=tool_caller,
                live_feed_manager=live_feed
            )

            # Score the report
            log_cb("Evaluating report quality...")
            evaluator = Evaluator()
            score = evaluator.score(q, result["report_md"])
            log_cb(f"Eval complete — composite: {score.composite:.1f}/10")

            # Save report
            report_id = new_id("rpt")
            conn = get_db()
            conn.execute(
                "INSERT INTO reports (id, run_id, title, content_md, scenarios_json, eval_score_json) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    report_id, run_id,
                    f"Research Report: {q[:80]}",
                    result["report_md"],
                    json.dumps(result.get("scenarios", [])),
                    score.model_dump_json(),
                )
            )
            # Mark run complete
            log_lines.append("✓ Run complete")
            conn.execute(
                "UPDATE runs SET status=?, finished_at=?, log=? WHERE id=?",
                ("completed", datetime.utcnow().isoformat(), "\n".join(log_lines), run_id)
            )
            conn.commit()
            conn.close()

        except Exception as e:
            log_lines.append(f"✗ Error: {str(e)}")
            conn = get_db()
            conn.execute(
                "UPDATE runs SET status=?, finished_at=?, log=?, error=? WHERE id=?",
                ("failed", datetime.utcnow().isoformat(), "\n".join(log_lines), str(e), run_id)
            )
            conn.commit()
            conn.close()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()


@router.get("/runs/{run_id}")
def get_run(run_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Run not found")
    return dict(row)

from fastapi.responses import StreamingResponse
import asyncio

@router.get("/runs/{run_id}/events")
async def stream_run_events(run_id: str):
    """Stream structured events using Server-Sent Events (SSE)."""
    async def event_generator():
        last_count = 0
        while True:
            # Re-fetch from DB since it's updated in background thread
            conn = get_db()
            row = conn.execute("SELECT status, events_jsonl FROM runs WHERE id=?", (run_id,)).fetchone()
            conn.close()
            
            if not row:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Run not found'})}\n\n"
                break
                
            events_str = row["events_jsonl"] or ""
            events = [line for line in events_str.split("\n") if line.strip()]
            
            # Yield any new events
            for line in events[last_count:]:
                yield f"data: {line}\n\n"
            
            last_count = len(events)
            
            # End of stream if completed or failed
            if row["status"] in ["completed", "failed"]:
                # Ensure we don't end loop until we yield everything
                yield f"data: {json.dumps({'type': 'stream_end', 'status': row['status']})}\n\n"
                break
                
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/projects/{proj_id}/runs")
def list_runs(proj_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT id, project_id, config_id, mode, status, started_at, finished_at, error FROM runs "
        "WHERE project_id=? ORDER BY started_at DESC",
        (proj_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
