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


@router.get("/agent_reach/status")
async def agent_reach_status():
    """Check the health of all Agent-Reach tool dependencies."""
    import subprocess, shutil

    def _check_cli(name: str, args: list[str] = None) -> dict:
        """Check if a CLI tool is installed and working."""
        path = shutil.which(name)
        if not path:
            return {"name": name, "installed": False, "path": None, "version": None}
        try:
            test_args = args or [name, "--version"]
            result = subprocess.run(
                test_args, capture_output=True, text=True, timeout=5
            )
            version = result.stdout.strip().split("\n")[0][:60] if result.stdout else None
            return {"name": name, "installed": True, "path": path, "version": version}
        except Exception:
            return {"name": name, "installed": True, "path": path, "version": "unknown"}

    def _check_python_module(name: str) -> dict:
        """Check if a Python module is importable."""
        try:
            mod = __import__(name)
            ver = getattr(mod, "__version__", "installed")
            return {"name": name, "installed": True, "version": ver}
        except ImportError:
            return {"name": name, "installed": False, "version": None}

    # Check all Agent-Reach dependencies
    cli_tools = [
        _check_cli("bird", ["bird", "--help"]),
        _check_cli("yt-dlp", ["yt-dlp", "--version"]),
        _check_cli("gh", ["gh", "--version"]),
    ]

    python_deps = [
        _check_python_module("feedparser"),
        _check_python_module("requests"),
        _check_python_module("bs4"),
    ]

    # Check enabled tools
    from packages.tools.registry import get_all_tools, get_enabled_tool_ids
    all_tools = get_all_tools()
    enabled = get_enabled_tool_ids()
    agent_reach_tools = [
        {"id": t.id, "name": t.name, "icon": t.icon, "category": t.category, "enabled": t.id in enabled}
        for t in all_tools
        if t.category in ("social", "fetch") or t.id in (
            "twitter_search", "youtube_search", "github_search",
            "reddit_search", "web_reader", "rss_reader"
        )
    ]

    all_cli_ok = all(t["installed"] for t in cli_tools)
    all_py_ok = all(d["installed"] for d in python_deps)

    return {
        "status": "ready" if (all_cli_ok and all_py_ok) else "partial",
        "cli_tools": cli_tools,
        "python_deps": python_deps,
        "agent_reach_tools": agent_reach_tools,
        "summary": {
            "total_tools": len(agent_reach_tools),
            "enabled_tools": sum(1 for t in agent_reach_tools if t["enabled"]),
            "cli_ready": all_cli_ok,
            "python_ready": all_py_ok,
        }
    }
