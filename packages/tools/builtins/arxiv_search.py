"""ArXiv Papers — search academic papers on arXiv."""

TOOL_DEF = {
    "id": "arxiv_search",
    "name": "ArXiv Papers",
    "description": "Search academic papers on arXiv.org. Returns paper titles, authors, abstracts, and links. Best for scientific and technical research.",
    "icon": "📑",
    "category": "academic",
    "needs_api_key": False,
}


def execute(query: str, config: dict) -> str:
    try:
        import arxiv
        client = arxiv.Client()
        search = arxiv.Search(
            query=query.strip(),
            max_results=5,
            sort_by=arxiv.SortCriterion.Relevance,
        )
        results = []
        for paper in client.results(search):
            authors = ", ".join([a.name for a in paper.authors[:3]])
            if len(paper.authors) > 3:
                authors += f" et al. ({len(paper.authors)} authors)"
            abstract = paper.summary[:400]
            if len(paper.summary) > 400:
                abstract += "..."
            results.append(
                f"**{paper.title}**\n"
                f"Authors: {authors}\n"
                f"Published: {paper.published.strftime('%Y-%m-%d')}\n"
                f"Abstract: {abstract}\n"
                f"Link: {paper.entry_id}"
            )
        if not results:
            return f"No arXiv papers found for: {query}"
        return "\n\n---\n\n".join(results)
    except Exception as e:
        return f"ArXiv search failed: {e}"
