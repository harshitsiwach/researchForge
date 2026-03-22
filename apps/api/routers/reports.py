"""Report retrieval and export router."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
import json
from packages.database.core import get_db

router = APIRouter()


@router.get("/runs/{run_id}/report")
def get_report(run_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM reports WHERE run_id=?", (run_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Report not found")
    d = dict(row)
    d["scenarios"] = json.loads(d.pop("scenarios_json", "[]"))
    d["eval_score"] = json.loads(d.pop("eval_score_json", "{}"))
    return d


@router.get("/runs/{run_id}/report/export")
def export_report(run_id: str, format: str = "md"):
    conn = get_db()
    row = conn.execute("SELECT * FROM reports WHERE run_id=?", (run_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Report not found")

    if format == "json":
        d = dict(row)
        d["scenarios"] = json.loads(d.pop("scenarios_json", "[]"))
        d["eval_score"] = json.loads(d.pop("eval_score_json", "{}"))
        return d
    elif format == "html":
        # Simple HTML wrapper
        html = f"""<!DOCTYPE html>
<html><head><title>{row['title']}</title>
<style>body{{font-family:Inter,sans-serif;max-width:800px;margin:2rem auto;padding:1rem;background:#0f172a;color:#e2e8f0}}
h1,h2,h3{{color:#818cf8}}pre{{background:#1e293b;padding:1rem;border-radius:8px;overflow-x:auto}}</style>
</head><body><h1>{row['title']}</h1><div>{row['content_md']}</div></body></html>"""
        return PlainTextResponse(html, media_type="text/html")
    else:
        return PlainTextResponse(row["content_md"], media_type="text/markdown")
