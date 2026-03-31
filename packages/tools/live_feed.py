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
        self.question = question
        self.sources = sources or []
        self.interval = interval
        self._queue: queue.Queue[FeedItem] = queue.Queue()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._seen_titles: set[str] = set()
        self._fetch_count = 0
        self._ws_apps = []

    def start(self):
        """Start the background feed fetcher."""
        if not self.sources:
            return  # Nothing to do
        self._stop_event.clear()
        
        # Start the polling loop thread
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        
        # Start persistent websocket listeners
        for source in self.sources:
            if source.get("type") == "websocket":
                self._start_websocket_listener(source)

    def stop(self):
        """Stop the background feed fetcher."""
        self._stop_event.set()
        
        # Close any open websockets
        for ws in self._ws_apps:
            try:
                ws.close()
            except:
                pass
                
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
                elif source_type == "api_poll":
                    self._fetch_api_poll(source)
                elif source_type == "twitter":
                    self._fetch_twitter(query)
                elif source_type == "reddit":
                    self._fetch_reddit(query)
                # Note: 'websocket' type is handled via persistent threads started in start()
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

    def _fetch_api_poll(self, source: dict):
        url = source.get("url", "")
        if not url:
            return
            
        try:
            import requests
            import json
            resp = requests.get(url, timeout=10)
            try:
                data = resp.json()
                content = json.dumps(data, indent=2)
            except:
                content = resp.text
                
            # Use content hash to avoid spamming the same unchanged API response
            import hashlib
            content_hash = hashlib.md5(content.encode()).hexdigest()
            if content_hash in self._seen_titles:
                return
            self._seen_titles.add(content_hash)
            
            self._queue.put(FeedItem(
                source_type="api_poll",
                title=f"API Response from {url}",
                content=content[:5000],
                url=url
            ))
        except Exception as e:
            print(f"[LiveFeed] API Poll failed: {e}")

    def _fetch_twitter(self, query: str):
        """Fetch latest tweets via bird CLI (Agent-Reach)."""
        try:
            import subprocess
            result = subprocess.run(
                ["bird", "search", query, "--count", "5"],
                capture_output=True, text=True, timeout=15,
            )
            if result.returncode != 0:
                return

            # Parse lines as individual tweets
            content = result.stdout.strip()
            if not content:
                return

            # Use content hash to deduplicate
            import hashlib
            for chunk in content.split("\n\n"):
                chunk = chunk.strip()
                if not chunk:
                    continue
                chunk_hash = hashlib.md5(chunk.encode()).hexdigest()[:16]
                if chunk_hash in self._seen_titles:
                    continue
                self._seen_titles.add(chunk_hash)

                # Extract title from first line
                first_line = chunk.split("\n")[0][:100]
                self._queue.put(FeedItem(
                    source_type="twitter",
                    title=f"Tweet: {first_line}",
                    content=chunk[:500],
                    url="",
                ))
        except FileNotFoundError:
            print("[LiveFeed] bird CLI not installed — skipping Twitter feed")
        except Exception as e:
            print(f"[LiveFeed] Twitter fetch failed: {e}")

    def _fetch_reddit(self, query: str):
        """Fetch latest Reddit posts via public JSON API (Agent-Reach)."""
        try:
            import requests
            url = "https://www.reddit.com/search.json"
            params = {"q": query, "sort": "new", "limit": 5, "t": "day"}
            headers = {"User-Agent": "ResearchForge/1.0 (AI Research Agent)"}

            resp = requests.get(url, params=params, headers=headers, timeout=10)
            if resp.status_code != 200:
                return

            data = resp.json()
            posts = data.get("data", {}).get("children", [])

            for p in posts:
                pd = p.get("data", {})
                title = pd.get("title", "")
                if not title or title in self._seen_titles:
                    continue
                self._seen_titles.add(title)

                subreddit = pd.get("subreddit_name_prefixed", "r/unknown")
                selftext = pd.get("selftext", "")[:300]
                score = pd.get("score", 0)
                permalink = pd.get("permalink", "")

                self._queue.put(FeedItem(
                    source_type="reddit",
                    title=f"[{subreddit}] {title}",
                    content=f"Score: {score}\n{selftext}",
                    url=f"https://reddit.com{permalink}" if permalink else "",
                ))
        except Exception as e:
            print(f"[LiveFeed] Reddit fetch failed: {e}")

    def _start_websocket_listener(self, source: dict):
        url = source.get("url", "")
        if not url:
            return
            
        def on_message(ws, message):
            if self._stop_event.is_set():
                ws.close()
                return
                
            # Filter identical repetitive messages
            import hashlib
            msg_hash = hashlib.md5(message.encode()).hexdigest()
            if msg_hash in self._seen_titles:
                return
            self._seen_titles.add(msg_hash)
            
            try:
                import json
                parsed = json.loads(message)
                content = json.dumps(parsed, indent=2)
            except:
                content = str(message)
                
            self._queue.put(FeedItem(
                source_type="websocket",
                title=f"New WebSocket Message",
                content=content[:2000],
                url=url
            ))

        def on_error(ws, error):
            print(f"[LiveFeed] WebSocket Error ({url}): {error}")

        def run_ws():
            try:
                import websocket
                ws = websocket.WebSocketApp(url, on_message=on_message, on_error=on_error)
                self._ws_apps.append(ws)
                ws.run_forever()
            except Exception as e:
                print(f"[LiveFeed] Failed to start WSS {url}: {e}")

        t = threading.Thread(target=run_ws, daemon=True)
        t.start()
