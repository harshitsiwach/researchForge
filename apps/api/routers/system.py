from fastapi import APIRouter
from packages.database.core import get_db

router = APIRouter()

@router.get("/active_jobs")
async def get_active_jobs():
    """Returns all currently running simulations and auto-research jobs."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get running simulations (runs)
    cursor.execute("SELECT id, project_id, mode, status, started_at FROM runs WHERE status = 'running'")
    runs = [dict(r) for r in cursor.fetchall()]
    
    # Get running auto-research jobs
    cursor.execute("SELECT id, project_id, topic, status, started_at FROM auto_research_jobs WHERE status = 'running'")
    ar_jobs = [dict(j) for j in cursor.fetchall()]

    # Get total report count
    cursor.execute("SELECT COUNT(*) FROM reports")
    total_reports = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "runs": runs,
        "auto_research_jobs": ar_jobs,
        "total_active": len(runs) + len(ar_jobs),
        "total_reports": total_reports
    }
