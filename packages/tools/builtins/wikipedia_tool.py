"""Wikipedia — pull structured summaries from Wikipedia."""

TOOL_DEF = {
    "id": "wikipedia",
    "name": "Wikipedia",
    "description": "Look up a topic on Wikipedia and get a structured summary with key facts. Great for background context and definitions.",
    "icon": "📚",
    "category": "academic",
    "needs_api_key": False,
}


def execute(query: str, config: dict) -> str:
    try:
        import wikipediaapi
        wiki = wikipediaapi.Wikipedia(
            user_agent="ResearchForge/1.0",
            language="en"
        )
        page = wiki.page(query.strip())
        if not page.exists():
            # Try search-like approach
            return f"Wikipedia page not found for: {query}. Try a more specific term."

        summary = page.summary
        if len(summary) > 3000:
            summary = summary[:3000] + "\n\n[...truncated]"

        sections = []
        for s in list(page.sections)[:6]:
            if s.text.strip():
                sections.append(f"### {s.title}\n{s.text[:500]}")

        result = f"# {page.title}\n\n{summary}"
        if sections:
            result += "\n\n" + "\n\n".join(sections)
        result += f"\n\nSource: {page.fullurl}"
        return result
    except Exception as e:
        return f"Wikipedia lookup failed: {e}"
