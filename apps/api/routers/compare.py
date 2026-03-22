"""Baseline vs Challenger comparison router."""

import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from packages.database.core import get_db
from packages.evaluation.scorer import Evaluator

router = APIRouter()


class CompareRequest(BaseModel):
    baseline_run_id: str
    challenger_run_id: str


@router.post("/projects/{proj_id}/compare")
def compare_runs(proj_id: str, body: CompareRequest):
    conn = get_db()

    # Get both reports
    baseline_report = conn.execute(
        "SELECT r.content_md, ru.project_id FROM reports r JOIN runs ru ON r.run_id=ru.id WHERE r.run_id=?",
        (body.baseline_run_id,)
    ).fetchone()
    challenger_report = conn.execute(
        "SELECT r.content_md, ru.project_id FROM reports r JOIN runs ru ON r.run_id=ru.id WHERE r.run_id=?",
        (body.challenger_run_id,)
    ).fetchone()

    if not baseline_report or not challenger_report:
        conn.close()
        raise HTTPException(404, "One or both reports not found. Ensure both runs are completed.")

    # Get project question
    proj = conn.execute("SELECT question FROM projects WHERE id=?", (proj_id,)).fetchone()
    conn.close()

    question = proj["question"] if proj else "Research analysis"

    evaluator = Evaluator()
    result = evaluator.compare(
        question=question,
        baseline_md=baseline_report["content_md"],
        challenger_md=challenger_report["content_md"],
        baseline_run_id=body.baseline_run_id,
        challenger_run_id=body.challenger_run_id,
    )

    return result.model_dump()


@router.post("/projects/{proj_id}/promote/{run_id}")
def promote_config(proj_id: str, run_id: str):
    conn = get_db()

    # Get the run's config
    run = conn.execute("SELECT config_id FROM runs WHERE id=? AND project_id=?", (run_id, proj_id)).fetchone()
    if not run:
        conn.close()
        raise HTTPException(404, "Run not found")

    # Demote all current baselines for this project
    conn.execute("UPDATE configs SET is_baseline=0 WHERE project_id=?", (proj_id,))

    # Promote this config
    conn.execute(
        "UPDATE configs SET is_baseline=1, promoted_at=? WHERE id=?",
        (datetime.utcnow().isoformat(), run["config_id"])
    )
    conn.commit()

    cfg = conn.execute("SELECT * FROM configs WHERE id=?", (run["config_id"],)).fetchone()
    conn.close()

    return {"promoted": True, "config_id": run["config_id"], "config": json.loads(cfg["config_json"])}
