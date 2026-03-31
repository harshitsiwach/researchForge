"""Web Reader Tool — clean, readable text from any URL via Jina Reader (Agent-Reach).

Uses Jina Reader (https://r.jina.ai/) to convert any webpage into clean,
LLM-friendly markdown text. Much better than raw HTML scraping — strips
ads, navigation, and boilerplate automatically.

This is an upgrade over the basic url_scraper — Jina handles JavaScript-
rendered pages, paywalled content (sometimes), and complex layouts.
"""

import requests

TOOL_DEF = {
    "id": "web_reader",
    "name": "Web Reader (Jina)",
    "description": "Read any webpage and extract clean, readable text content. Uses Jina Reader for high-quality extraction — handles JS-rendered pages, complex layouts, and strips ads/boilerplate. Free, no API key needed.",
    "icon": "🌍",
    "category": "fetch",
    "needs_api_key": False,
    "config_fields": [],
}


def execute(query: str, config: dict) -> str:
    """Read a webpage via Jina Reader and return clean text.

    query should be a URL (with or without http prefix).
    """
    url = query.strip()

    if not url.startswith("http"):
        # If it doesn't look like a URL, try adding https
        if "." in url and " " not in url:
            url = "https://" + url
        else:
            return f"[WebReader] Please provide a valid URL. Got: {query}"

    # Use Jina Reader API
    jina_url = f"https://r.jina.ai/{url}"

    try:
        resp = requests.get(
            jina_url,
            timeout=20,
            headers={
                "User-Agent": "ResearchForge/1.0",
                "Accept": "text/plain",
            }
        )
        resp.raise_for_status()
        content = resp.text.strip()

        if not content:
            return f"[WebReader] No content extracted from: {url}"

        # Trim to reasonable length for LLM context
        if len(content) > 8000:
            content = content[:8000] + "\n\n[...content truncated at 8000 chars]"

        return f"**Content from {url}:**\n\n{content}"

    except requests.exceptions.Timeout:
        return f"[WebReader] Timeout reading: {url}"
    except requests.exceptions.HTTPError as e:
        # Fallback to direct scraping
        return _fallback_scrape(url)
    except Exception as e:
        return _fallback_scrape(url)


def _fallback_scrape(url: str) -> str:
    """Fallback: direct scraping with BeautifulSoup if Jina fails."""
    try:
        from bs4 import BeautifulSoup

        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36"
        })
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Remove noise
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        content = "\n".join(lines[:150])

        if len(content) > 6000:
            content = content[:6000] + "\n\n[...truncated]"

        return f"**Content from {url} (fallback scraper):**\n\n{content}"
    except Exception as e:
        return f"[WebReader] Failed to read {url}: {e}"
