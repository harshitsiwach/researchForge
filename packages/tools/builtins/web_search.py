"""Web Search — DuckDuckGo text search (free, no API key)."""

TOOL_DEF = {
    "id": "web_search",
    "name": "Web Search",
    "description": "Search the internet for latest information using DuckDuckGo. Returns top results with titles, snippets, and URLs.",
    "icon": "🌐",
    "category": "search",
    "needs_api_key": False,
}


def execute(query: str, config: dict) -> str:
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                results.append(f"**{r['title']}**\n{r['body']}\nSource: {r['href']}")
        if not results:
            return f"No results found for: {query}"
        return "\n\n---\n\n".join(results)
    except Exception as e:
        return f"Web search failed: {e}"
