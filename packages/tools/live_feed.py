"""
LiveFeedManager — Real-time data feed engine for simulation runs.

Continuously fetches fresh data from configured sources during a run
and makes it available for injection into agent debate rounds.

Supported source types:
  - news: Latest news headlines via DuckDuckGo News
  - web: Web search results for a query
  - rss: RSS/Atom feed subscription (future)
"""

from __future__ import annotations
import threading
import time
import queue
from datetime import datetime
from typing import Optional


class FeedItem:
    """A single piece of live data fetched from a source."""
    def __init__(self, source_type: str, title: str, content: str, url: str = "", fetched_at: str = ""):
        self.source_type = source_type
        self.title = title
        self.content = content
        self.url = url
        self.fetched_at = fetched_at or datetime.utcnow().isoformat()

    def to_context_str(self) -> str:
        """Format as a string suitable for injection into agent context."""
        parts = [f"[LIVE {self.source_type.upper()}] {self.title}"]
        if self.content:
            parts.append(self.content[:500])
        if self.url:
            parts.append(f"Source: {self.url}")
        return "\n".join(parts)

    def to_dict(self) -> dict:
        return {
            "source_type": self.source_type,
            "title": self.title,
            "content": self.content[:200],
            "url": self.url,
            "fetched_at": self.fetched_at,
        }


class LiveFeedManager:
    """Manages real-time data feeds during a simulation run."""

    def __init__(self, question: str, sources: list[dict] | None = None, interval: int = 30):
        """
        Args:
            question: The research question (used to generate search queries)
            sources: List of source configs, e.g. [{"type": "news", "query": "AI"}, {"type": "web", "query": "..."}]
            interval: Seconds between fetch cycles
        """
        self.question = question
        self.sources = sources or []
        self.interval = interval
        self._queue: queue.Queue[FeedItem] = queue.Queue()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._seen_titles: set[str] = set()
        self._fetch_count = 0

    def start(self):
        """Start the background feed fetcher."""
        if not self.sources:
            return  # Nothing to do
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the background feed fetcher."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)

    def pull_items(self) -> list[FeedItem]:
        """Pull all pending items from the queue (non-blocking)."""
        items = []
        while not self._queue.empty():
            try:
                items.append(self._queue.get_nowait())
            except queue.Empty:
                break
        return items

    def _run_loop(self):
        """Background loop that periodically fetches data."""
        # Do an initial fetch immediately
        self._fetch_all()
        while not self._stop_event.is_set():
            self._stop_event.wait(self.interval)
            if not self._stop_event.is_set():
                self._fetch_all()

    def _fetch_all(self):
        """Fetch from all configured sources."""
        for source in self.sources:
            try:
                source_type = source.get("type", "news")
                query = source.get("query", self.question)

                if source_type == "news":
                    self._fetch_news(query)
                elif source_type == "web":
                    self._fetch_web(query)
                elif source_type == "rss":
                    self._fetch_rss(source.get("url", ""))
            except Exception as e:
                print(f"[LiveFeed] Error fetching {source}: {e}")
        self._fetch_count += 1

    def _fetch_news(self, query: str):
        """Fetch latest news headlines."""
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                for r in ddgs.news(query, max_results=3):
                    title = r.get("title", "")
                    if title in self._seen_titles:
                        continue
                    self._seen_titles.add(title)
                    item = FeedItem(
                        source_type="news",
                        title=title,
                        content=r.get("body", ""),
                        url=r.get("url", ""),
                    )
                    self._queue.put(item)
        except Exception as e:
            print(f"[LiveFeed] News fetch failed: {e}")

    def _fetch_web(self, query: str):
        """Fetch web search results."""
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=3):
                    title = r.get("title", "")
                    if title in self._seen_titles:
                        continue
                    self._seen_titles.add(title)
                    item = FeedItem(
                        source_type="web",
                        title=title,
                        content=r.get("body", ""),
                        url=r.get("href", ""),
                    )
                    self._queue.put(item)
        except Exception as e:
            print(f"[LiveFeed] Web fetch failed: {e}")

    def _fetch_rss(self, url: str):
        """Fetch items from an RSS/Atom feed."""
        if not url:
            return
        try:
            import requests
            from bs4 import BeautifulSoup
            resp = requests.get(url, timeout=10)
            soup = BeautifulSoup(resp.text, "xml")
            items = soup.find_all("item")[:3] or soup.find_all("entry")[:3]
            for item in items:
                title_tag = item.find("title")
                title = title_tag.get_text() if title_tag else "Untitled"
                if title in self._seen_titles:
                    continue
                self._seen_titles.add(title)
                desc_tag = item.find("description") or item.find("summary")
                link_tag = item.find("link")
                feed_item = FeedItem(
                    source_type="rss",
                    title=title,
                    content=desc_tag.get_text()[:500] if desc_tag else "",
                    url=link_tag.get_text() if link_tag else "",
                )
                self._queue.put(feed_item)
        except Exception as e:
            print(f"[LiveFeed] RSS fetch failed: {e}")
