"""Tools API router — list, toggle, configure, and test agent tools."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from packages.tools.registry import (
    get_all_tools, get_enabled_tool_ids, set_enabled_tool_ids, execute_tool
)

router = APIRouter()


@router.get("")
def list_tools():
    """List all available tools with their enabled/disabled status."""
    tools = get_all_tools()
    enabled = get_enabled_tool_ids()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "icon": t.icon,
            "category": t.category,
            "needs_api_key": t.needs_api_key,
            "config_fields": t.config_fields,
            "enabled": t.id in enabled,
        }
        for t in tools
    ]


@router.put("/{tool_id}/toggle")
def toggle_tool(tool_id: str):
    """Enable or disable a tool."""
    enabled = get_enabled_tool_ids()
    if tool_id in enabled:
        enabled.remove(tool_id)
        status = False
    else:
        enabled.append(tool_id)
        status = True
    set_enabled_tool_ids(enabled)
    return {"tool_id": tool_id, "enabled": status}


class ToolConfigBody(BaseModel):
    config: dict


@router.put("/{tool_id}/config")
def configure_tool(tool_id: str, body: ToolConfigBody):
    """Save tool-specific configuration (API keys, etc.)."""
    import json
    from packages.database.core import get_db
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO settings_kv (key, value) VALUES (?, ?)",
        (f"tool_config_{tool_id}", json.dumps(body.config))
    )
    conn.commit()
    conn.close()
    return {"tool_id": tool_id, "config": body.config}


class TestToolBody(BaseModel):
    query: str


@router.post("/{tool_id}/test")
def test_tool(tool_id: str, body: TestToolBody):
    """Test a tool with a sample query."""
    import json
    from packages.database.core import get_db
    # Load tool-specific config if any
    config = {}
    try:
        conn = get_db()
        row = conn.execute(
            "SELECT value FROM settings_kv WHERE key=?",
            (f"tool_config_{tool_id}",)
        ).fetchone()
        conn.close()
        if row and row["value"]:
            config = json.loads(row["value"])
    except Exception:
        pass

    result = execute_tool(tool_id, body.query, config)
    return {"tool_id": tool_id, "query": body.query, "result": result}
