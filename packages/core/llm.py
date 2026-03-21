"""LLM client — thin wrapper around OpenAI-compatible API.

Reads runtime settings from SQLite (set via Settings UI) first,
falling back to .env defaults. Supports any OpenAI-compatible
endpoint: Ollama, LM Studio, OpenAI, local servers, etc.
"""

import sqlite3
from pathlib import Path
from openai import OpenAI
from packages.core.config import settings


def _get_db_settings() -> dict:
    """Read LLM settings from the SQLite settings_kv table."""
    db_path = Path(settings.WORKSPACES_DIR) / "researchforge.db"
    if not db_path.exists():
        return {}
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT key, value FROM settings_kv").fetchall()
        conn.close()
        return {r["key"]: r["value"] for r in rows}
    except Exception:
        return {}


def get_llm_config() -> dict:
    """Resolve LLM config: DB settings override .env defaults."""
    db = _get_db_settings()
    return {
        "base_url": db.get("llm_base_url", settings.LLM_BASE_URL),
        "api_key": db.get("llm_api_key", settings.LLM_API_KEY),
        "model": db.get("llm_model", settings.LLM_MODEL),
    }


def get_llm_client() -> OpenAI:
    cfg = get_llm_config()
    return OpenAI(
        base_url=cfg["base_url"],
        api_key=cfg["api_key"],
    )


def chat(messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096) -> str:
    """Send a chat completion and return the text response."""
    cfg = get_llm_config()
    client = OpenAI(base_url=cfg["base_url"], api_key=cfg["api_key"])
    resp = client.chat.completions.create(
        model=cfg["model"],
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content or ""


def test_connection() -> dict:
    """Test LLM connectivity and return status info."""
    cfg = get_llm_config()
    try:
        client = OpenAI(base_url=cfg["base_url"], api_key=cfg["api_key"])
        # Try listing models first (lightweight)
        try:
            models = client.models.list()
            model_names = [m.id for m in models.data[:10]]
        except Exception:
            model_names = []

        # Try a minimal chat completion
        resp = client.chat.completions.create(
            model=cfg["model"],
            messages=[{"role": "user", "content": "Say 'connected' in one word."}],
            temperature=0,
            max_tokens=10,
        )
        reply = resp.choices[0].message.content or ""

        return {
            "connected": True,
            "base_url": cfg["base_url"],
            "model": cfg["model"],
            "available_models": model_names,
            "test_reply": reply.strip(),
        }
    except Exception as e:
        return {
            "connected": False,
            "base_url": cfg["base_url"],
            "model": cfg["model"],
            "error": str(e),
        }
