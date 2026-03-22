"""News Search — latest news headlines via DuckDuckGo News."""

TOOL_DEF = {
    "id": "news_search",
    "name": "News Search",
    "description": "Search for the latest news articles and headlines on any topic. Returns recent stories with titles, dates, and sources.",
    "icon": "📰",
    "category": "search",
    "needs_api_key": False,
}


def execute(query: str, config: dict) -> str:
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.news(query, max_results=5):
                date = r.get("date", "")
                source = r.get("source", "")
                results.append(
                    f"**{r['title']}**\n"
                    f"Source: {source} | {date}\n"
                    f"{r.get('body', '')}\n"
                    f"URL: {r.get('url', '')}"
                )
        if not results:
            return f"No news found for: {query}"
        return "\n\n---\n\n".join(results)
    except Exception as e:
        return f"News search failed: {e}"
