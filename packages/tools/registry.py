"""
Tool Registry — discovers, manages, and executes agent tools.

Each tool is a Python module in packages/tools/builtins/ with:
  - TOOL_DEF: dict with metadata (id, name, description, icon, category, needs_api_key)
  - execute(query: str, config: dict) -> str
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Callable, Optional
import importlib, json


@dataclass
class ToolDef:
    id: str
    name: str
    description: str
    icon: str
    category: str  # "search", "fetch", "compute", "academic"
    needs_api_key: bool = False
    config_fields: list[str] = field(default_factory=list)
    executor: Optional[Callable] = None


# ── Registry ────────────────────────────────────────────

BUILTIN_MODULES = [
    # ── Original tools ──
    "packages.tools.builtins.web_search",
    "packages.tools.builtins.url_scraper",
    "packages.tools.builtins.wikipedia_tool",
    "packages.tools.builtins.arxiv_search",
    "packages.tools.builtins.news_search",
    "packages.tools.builtins.calculator",
    "packages.tools.builtins.api_fetch",
    "packages.tools.builtins.websocket_read",
    # ── Agent-Reach tools (social + enhanced fetch) ──
    "packages.tools.builtins.twitter_tool",
    "packages.tools.builtins.youtube_tool",
    "packages.tools.builtins.github_tool",
    "packages.tools.builtins.reddit_tool",
    "packages.tools.builtins.web_reader",
    "packages.tools.builtins.rss_tool",
]

# Tool IDs that should be auto-enabled for every new project/run
AGENT_REACH_DEFAULTS = [
    "web_search", "web_reader", "news_search", "twitter_search",
    "youtube_search", "github_search", "reddit_search", "rss_reader",
    "arxiv", "wikipedia", "url_scraper",
]

_REGISTRY: dict[str, ToolDef] = {}


def _load_registry():
    """Import all builtin modules and register their TOOL_DEF."""
    if _REGISTRY:
        return
    for mod_path in BUILTIN_MODULES:
        try:
            mod = importlib.import_module(mod_path)
            td = mod.TOOL_DEF
            tool = ToolDef(
                id=td["id"],
                name=td["name"],
                description=td["description"],
                icon=td["icon"],
                category=td["category"],
                needs_api_key=td.get("needs_api_key", False),
                config_fields=td.get("config_fields", []),
                executor=mod.execute,
            )
            _REGISTRY[tool.id] = tool
        except Exception as e:
            print(f"[ToolRegistry] Failed to load {mod_path}: {e}")


def get_all_tools() -> list[ToolDef]:
    _load_registry()
    return list(_REGISTRY.values())


def get_tool(tool_id: str) -> Optional[ToolDef]:
    _load_registry()
    return _REGISTRY.get(tool_id)


def get_enabled_tool_ids() -> list[str]:
    """Read enabled tools from the settings_kv table."""
    try:
        from packages.database.core import get_db
        conn = get_db()
        row = conn.execute("SELECT value FROM settings_kv WHERE key='enabled_tools'").fetchone()
        conn.close()
        if row and row["value"]:
            return json.loads(row["value"])
    except Exception:
        pass
    return []


def set_enabled_tool_ids(ids: list[str]):
    from packages.database.core import get_db
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO settings_kv (key, value) VALUES (?, ?)",
        ("enabled_tools", json.dumps(ids))
    )
    conn.commit()
    conn.close()


def ensure_defaults_enabled():
    """Auto-enable Agent-Reach default tools if nothing is enabled yet.

    Called on first run to ensure the agent always has access to
    internet research tools without manual configuration.
    """
    current = get_enabled_tool_ids()
    if current:
        return  # User has already configured tools — don't override

    _load_registry()
    # Enable all defaults that are actually registered
    to_enable = [tid for tid in AGENT_REACH_DEFAULTS if tid in _REGISTRY]
    if to_enable:
        set_enabled_tool_ids(to_enable)


def get_enabled_tools() -> list[ToolDef]:
    _load_registry()
    ensure_defaults_enabled()
    enabled = get_enabled_tool_ids()
    return [t for t in _REGISTRY.values() if t.id in enabled]


def execute_tool(tool_id: str, query: str, config: dict | None = None) -> str:
    """Run a tool and return its text output."""
    _load_registry()
    tool = _REGISTRY.get(tool_id)
    if not tool:
        return f"[Error] Unknown tool: {tool_id}"
    if not tool.executor:
        return f"[Error] Tool {tool_id} has no executor"
    try:
        return tool.executor(query, config or {})
    except Exception as e:
        return f"[Error] Tool {tool_id} failed: {e}"
