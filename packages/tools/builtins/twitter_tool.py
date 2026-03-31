"""Twitter/X Tool — search and read tweets via bird CLI (Agent-Reach).

Uses the `bird` CLI (https://www.npmjs.com/package/@steipete/bird) which
accesses Twitter via cookie auth — zero API fees.

Capabilities:
  - Search tweets by keyword
  - Read a specific tweet/thread by URL
"""

import subprocess
import json

TOOL_DEF = {
    "id": "twitter_search",
    "name": "Twitter / X Search",
    "description": "Search Twitter/X for tweets, discussions, and opinions on any topic. Returns recent tweets with content, author, and engagement metrics. Free, no API key needed (uses bird CLI).",
    "icon": "🐦",
    "category": "social",
    "needs_api_key": False,
    "config_fields": [],
}


def _run_bird(args: list[str], timeout: int = 20) -> str:
    """Execute the bird CLI and return stdout."""
    try:
        result = subprocess.run(
            ["bird"] + args,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            err = result.stderr.strip()
            if "cookie" in err.lower() or "auth" in err.lower():
                return (
                    "[Twitter] Authentication required. Configure cookies with:\n"
                    "  agent-reach configure twitter-cookies \"<your_cookies>\"\n"
                    "Or export cookies from browser using Cookie-Editor extension."
                )
            return f"[Twitter] bird CLI error: {err or result.stdout}"
        return result.stdout.strip()
    except FileNotFoundError:
        return (
            "[Twitter] bird CLI not found. Install with:\n"
            "  npm install -g @steipete/bird"
        )
    except subprocess.TimeoutExpired:
        return "[Twitter] Request timed out after 20 seconds."


def execute(query: str, config: dict) -> str:
    """Search Twitter or read a specific tweet.

    If the query looks like a URL, read that tweet.
    Otherwise, search for the query term.
    """
    query = query.strip()

    # Detect if it's a tweet URL
    if "twitter.com/" in query or "x.com/" in query:
        return _read_tweet(query)

    return _search_tweets(query)


def _search_tweets(query: str) -> str:
    """Search Twitter for a query string."""
    raw = _run_bird(["search", query, "--count", "10"])

    if raw.startswith("[Twitter]"):
        return raw  # Error message

    # Format results nicely
    lines = raw.split("\n")
    if not lines or not raw:
        return f"No tweets found for: {query}"

    return f"**Twitter Search Results for \"{query}\":**\n\n{raw}"


def _read_tweet(url: str) -> str:
    """Read a specific tweet/thread by URL."""
    raw = _run_bird(["read", url])

    if raw.startswith("[Twitter]"):
        return raw

    if not raw:
        return f"Could not read tweet: {url}"

    return f"**Tweet Content ({url}):**\n\n{raw}"
