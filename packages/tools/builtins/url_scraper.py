"""URL Scraper — fetch and extract readable text from any webpage."""

TOOL_DEF = {
    "id": "url_scraper",
    "name": "URL Scraper",
    "description": "Fetch a webpage and extract its main readable text content. Useful for reading articles, blog posts, and documentation.",
    "icon": "📄",
    "category": "fetch",
    "needs_api_key": False,
}


def execute(query: str, config: dict) -> str:
    """query should be a URL."""
    import requests
    from bs4 import BeautifulSoup

    url = query.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (ResearchForge Agent)"
        })
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Remove scripts, styles, nav, footer
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        # Trim to reasonable length
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        content = "\n".join(lines[:150])  # ~150 lines max
        if len(content) > 6000:
            content = content[:6000] + "\n\n[...truncated]"
        return f"**Content from {url}:**\n\n{content}"
    except Exception as e:
        return f"Failed to fetch {url}: {e}"
