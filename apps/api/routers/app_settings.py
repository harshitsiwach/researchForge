"""Application settings router (model endpoint, keys, connection test)."""

import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from packages.database.core import get_db

router = APIRouter()


class UpdateSettings(BaseModel):
    llm_base_url: Optional[str] = None
    llm_model: Optional[str] = None
    llm_api_key: Optional[str] = None
    max_agents: Optional[int] = None
    max_rounds: Optional[int] = None


@router.get("")
def get_settings():
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM settings_kv").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}


@router.put("")
def update_settings(body: UpdateSettings):
    conn = get_db()
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        conn.execute(
            "INSERT OR REPLACE INTO settings_kv (key, value) VALUES (?, ?)",
            (key, str(value))
        )
    conn.commit()
    rows = conn.execute("SELECT key, value FROM settings_kv").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}


@router.post("/test-connection")
def test_llm_connection():
    """Test connectivity to the configured LLM endpoint."""
    from packages.core.llm import test_connection
    return test_connection()


@router.get("/models")
def list_available_models():
    """List models available at the configured LLM endpoint."""
    from packages.core.llm import get_llm_config
    from openai import OpenAI
    cfg = get_llm_config()
    try:
        client = OpenAI(base_url=cfg["base_url"], api_key=cfg["api_key"])
        models = client.models.list()
        return {
            "connected": True,
            "models": [{"id": m.id, "owned_by": getattr(m, "owned_by", "")} for m in models.data],
        }
    except Exception as e:
        return {"connected": False, "error": str(e), "models": []}
