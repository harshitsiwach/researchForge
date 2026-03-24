"""API Fetcher — perform a raw HTTP request to an API endpoint."""
import json
import requests

TOOL_DEF = {
    "id": "api_fetch",
    "name": "API Fetcher",
    "description": "Fetch data directly from an API endpoint. Pass the URL as the query. Returns the raw JSON response. Useful for querying live public APIs.",
    "icon": "🔌",
    "category": "fetch",
    "needs_api_key": False,
}

def execute(query: str, config: dict) -> str:
    url = query.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        
        # Try returning pretty JSON if possible
        try:
            data = resp.json()
            out = json.dumps(data, indent=2)
            if len(out) > 4000:
                out = out[:4000] + "\n...[truncated]"
            return f"API Response from {url}:\n```json\n{out}\n```"
        except ValueError:
            # Not JSON
            out = resp.text
            if len(out) > 4000:
                out = out[:4000] + "\n...[truncated]"
            return f"API Response from {url}:\n{out}"

    except Exception as e:
        return f"Failed to fetch {url}: {e}"
