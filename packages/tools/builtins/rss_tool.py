"""RSS Feed Tool — subscribe to and read RSS/Atom feeds (Agent-Reach).

Uses `feedparser` (https://github.com/kurtmckee/feedparser) to parse
RSS and Atom feeds. Free, no API key needed.

Capabilities:
  - Read latest entries from any RSS/Atom feed URL
  - Get structured feed data (title, summary, link, date)
"""

TOOL_DEF = {
    "id": "rss_reader",
    "name": "RSS Feed Reader",
    "description": "Read and parse RSS/Atom feeds to get latest articles, blog posts, and updates from any source. Provide a feed URL to get structured entries. Free, no API key needed.",
    "icon": "📡",
    "category": "fetch",
    "needs_api_key": False,
    "config_fields": [],
}


def execute(query: str, config: dict) -> str:
    """Parse an RSS/Atom feed URL and return formatted entries.

    query should be an RSS feed URL.
    """
    try:
        import feedparser
    except ImportError:
        return "[RSS] feedparser not installed. Run: pip install feedparser"

    url = query.strip()

    if not url.startswith("http"):
        if "." in url and " " not in url:
            url = "https://" + url
        else:
            return f"[RSS] Please provide a valid RSS/Atom feed URL. Got: {query}"

    try:
        feed = feedparser.parse(url)
    except Exception as e:
        return f"[RSS] Failed to parse feed: {e}"

    if feed.bozo and not feed.entries:
        return f"[RSS] Invalid or unreachable feed: {url}\nError: {feed.bozo_exception}"

    feed_title = feed.feed.get("title", "Unknown Feed")
    feed_desc = feed.feed.get("description", "")[:200]

    entries = feed.entries[:10]  # Limit to 10 entries

    if not entries:
        return f"[RSS] No entries found in feed: {url}"

    results = [f"**📡 {feed_title}**"]
    if feed_desc:
        results.append(feed_desc)
    results.append("")

    for entry in entries:
        title = entry.get("title", "Untitled")
        link = entry.get("link", "")
        published = entry.get("published", entry.get("updated", ""))
        summary = entry.get("summary", "")[:300]

        # Clean HTML from summary
        if "<" in summary:
            try:
                from bs4 import BeautifulSoup
                summary = BeautifulSoup(summary, "html.parser").get_text()
            except ImportError:
                import re
                summary = re.sub(r"<[^>]+>", "", summary)

        item = f"**{title}**"
        if published:
            item += f"\n📅 {published}"
        if summary:
            item += f"\n{summary}"
        if link:
            item += f"\n🔗 {link}"
        results.append(item)
        results.append("---")

    return "\n\n".join(results)
