"""Live data feed configuration router."""

import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from packages.database.core import get_db

router = APIRouter()


class FeedSource(BaseModel):
    id: str
    type: str  # "news", "web", "rss"
    query: str = ""
    url: str = ""
    name: str = ""


class ConfigFeedsRequest(BaseModel):
    sources: list[FeedSource]


@router.get("/feeds/sources")
def get_feed_types():
    """Return available feed source types."""
    return [
        {"type": "news", "label": "News Headline Monitor", "icon": "📰", "requires": "query"},
        {"type": "web", "label": "Web Search Monitor", "icon": "🌐", "requires": "query"},
        {"type": "rss", "label": "RSS/Atom Feed", "icon": "📡", "requires": "url"},
    ]


@router.post("/projects/{proj_id}/feeds")
def configure_project_feeds(proj_id: str, body: ConfigFeedsRequest):
    """Save active feed sources for a project."""
    conn = get_db()
    
    # Store in settings_kv mapped to the project id
    key = f"feeds_{proj_id}"
    sources_data = [s.model_dump() for s in body.sources]
    
    conn.execute(
        "INSERT OR REPLACE INTO settings_kv (key, value) VALUES (?, ?)",
        (key, json.dumps(sources_data))
    )
    conn.commit()
    conn.close()
    
    return {"status": "ok", "sources": sources_data}


@router.get("/projects/{proj_id}/feeds")
def get_project_feeds(proj_id: str):
    """Get active feed sources for a project."""
    conn = get_db()
    key = f"feeds_{proj_id}"
    row = conn.execute("SELECT value FROM settings_kv WHERE key=?", (key,)).fetchone()
    conn.close()
    
    if row and row["value"]:
        return json.loads(row["value"])
    return []


@router.post("/feeds/test")
def test_feed_source(source: FeedSource):
    """Test fetching from a feed source to ensure it works."""
    # We can reuse LiveFeedManager logic by starting it for 1 cycle 
    # and directly calling the internal fetch, but it's simpler to just do a quick manual fetch.
    try:
        if source.type == "news":
            from duckduckgo_search import DDGS
            results = list(DDGS().news(source.query, max_results=1))
            return {"success": True, "count": len(results), "sample": results[0] if results else None}
            
        elif source.type == "web":
            from duckduckgo_search import DDGS
            results = list(DDGS().text(source.query, max_results=1))
            return {"success": True, "count": len(results), "sample": results[0] if results else None}
            
        elif source.type == "rss":
            if not source.url:
                raise ValueError("RSS feed requires a URL")
            import requests
            from bs4 import BeautifulSoup
            resp = requests.get(source.url, timeout=10)
            soup = BeautifulSoup(resp.text, "xml")
            items = soup.find_all("item") or soup.find_all("entry")
            if not items:
                return {"success": False, "error": "No items found in RSS feed"}
            title_tag = items[0].find("title")
            return {"success": True, "count": len(items), "sample": {"title": title_tag.get_text() if title_tag else "Untitled"}}
            
        else:
            raise ValueError(f"Unknown feed type: {source.type}")
            
    except Exception as e:
        return {"success": False, "error": str(e)}
