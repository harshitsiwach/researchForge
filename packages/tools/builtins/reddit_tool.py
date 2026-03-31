"""Reddit Tool — search and read Reddit posts via JSON API (Agent-Reach).

Uses Reddit's public JSON API (append .json to any URL) to read posts
and search subreddits. No API key, no PRAW, no auth needed.

Note: Reddit blocks data-center IPs. If running on a server, configure
a residential proxy via: agent-reach configure proxy http://user:pass@ip:port

Capabilities:
  - Search Reddit for discussions on any topic
  - Read a specific Reddit post/thread
  - Browse subreddit top posts
"""

import json

TOOL_DEF = {
    "id": "reddit_search",
    "name": "Reddit Search",
    "description": "Search Reddit for discussions, opinions, and threads on any topic. Read specific posts and comments. Free, no API key or Reddit account needed.",
    "icon": "🗣️",
    "category": "social",
    "needs_api_key": False,
    "config_fields": [],
}

_HEADERS = {
    "User-Agent": "ResearchForge/1.0 (AI Research Agent)",
    "Accept": "application/json",
}


def execute(query: str, config: dict) -> str:
    """Search Reddit or read a specific post.

    If query is a Reddit URL, read that post.
    If query starts with "r/", browse that subreddit.
    Otherwise, search Reddit.
    """
    import requests

    query = query.strip()

    proxy = config.get("proxy")
    proxies = {"http": proxy, "https": proxy} if proxy else None

    if "reddit.com/" in query:
        return _read_post(query, proxies)

    if query.startswith("r/"):
        return _browse_subreddit(query, proxies)

    return _search_reddit(query, proxies)


def _search_reddit(query: str, proxies: dict | None = None) -> str:
    """Search Reddit for a topic."""
    import requests

    url = "https://www.reddit.com/search.json"
    params = {"q": query, "sort": "relevance", "limit": 8, "t": "month"}

    try:
        resp = requests.get(url, params=params, headers=_HEADERS, timeout=15, proxies=proxies)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.HTTPError as e:
        if resp.status_code == 403:
            return (
                "[Reddit] Access blocked (403). Reddit blocks data-center IPs.\n"
                "If on a server, configure a residential proxy:\n"
                "  agent-reach configure proxy http://user:pass@ip:port"
            )
        return f"[Reddit] HTTP error: {e}"
    except Exception as e:
        return f"[Reddit] Search failed: {e}"

    posts = data.get("data", {}).get("children", [])
    if not posts:
        return f"No Reddit posts found for: {query}"

    results = []
    for p in posts:
        pd = p.get("data", {})
        title = pd.get("title", "Untitled")
        sub = pd.get("subreddit_name_prefixed", "r/unknown")
        score = pd.get("score", 0)
        num_comments = pd.get("num_comments", 0)
        selftext = pd.get("selftext", "")[:300]
        permalink = pd.get("permalink", "")
        full_url = f"https://reddit.com{permalink}" if permalink else ""

        entry = f"**{title}**\n{sub} | ⬆️ {score} | 💬 {num_comments} comments"
        if selftext:
            entry += f"\n{selftext}"
        if full_url:
            entry += f"\nURL: {full_url}"
        results.append(entry)

    return f"**Reddit Search: \"{query}\"**\n\n" + "\n\n---\n\n".join(results)


def _read_post(url: str, proxies: dict | None = None) -> str:
    """Read a specific Reddit post and its top comments."""
    import requests

    # Ensure .json suffix
    clean_url = url.rstrip("/")
    if not clean_url.endswith(".json"):
        clean_url += ".json"

    try:
        resp = requests.get(clean_url, headers=_HEADERS, timeout=15, proxies=proxies)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        return f"[Reddit] Failed to read post: {e}"

    if not isinstance(data, list) or len(data) < 1:
        return f"[Reddit] Unexpected response format for: {url}"

    # Post data
    post = data[0].get("data", {}).get("children", [{}])[0].get("data", {})
    title = post.get("title", "Untitled")
    author = post.get("author", "unknown")
    score = post.get("score", 0)
    selftext = post.get("selftext", "")[:1500]
    sub = post.get("subreddit_name_prefixed", "r/unknown")

    output = [
        f"**{title}**",
        f"{sub} | by u/{author} | ⬆️ {score}",
    ]
    if selftext:
        output.append(f"\n{selftext}")

    # Top comments
    if len(data) > 1:
        comments = data[1].get("data", {}).get("children", [])
        if comments:
            output.append(f"\n**Top Comments ({len(comments)}):**")
            for c in comments[:6]:
                cd = c.get("data", {})
                if cd.get("author") and cd.get("body"):
                    c_score = cd.get("score", 0)
                    output.append(f"\nu/{cd['author']} (⬆️ {c_score}):\n{cd['body'][:400]}")

    return "\n".join(output)


def _browse_subreddit(subreddit: str, proxies: dict | None = None) -> str:
    """Browse top posts from a subreddit."""
    import requests

    url = f"https://www.reddit.com/{subreddit}/hot.json"
    params = {"limit": 8}

    try:
        resp = requests.get(url, params=params, headers=_HEADERS, timeout=15, proxies=proxies)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        return f"[Reddit] Failed to browse {subreddit}: {e}"

    posts = data.get("data", {}).get("children", [])
    if not posts:
        return f"No posts found in {subreddit}"

    results = []
    for p in posts:
        pd = p.get("data", {})
        title = pd.get("title", "Untitled")
        score = pd.get("score", 0)
        num_comments = pd.get("num_comments", 0)
        permalink = pd.get("permalink", "")
        results.append(
            f"**{title}**\n"
            f"⬆️ {score} | 💬 {num_comments}\n"
            f"https://reddit.com{permalink}"
        )

    return f"**{subreddit} — Hot Posts:**\n\n" + "\n\n---\n\n".join(results)
