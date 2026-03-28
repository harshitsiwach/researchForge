import httpx
import json
import asyncio
from typing import List, Dict, Optional, Any

class ResearchForgeAPI:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url

    async def get_workspaces(self) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/api/workspaces")
            return resp.json()

    async def get_workspace(self, ws_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/api/workspaces/{ws_id}")
            return resp.json()

    async def get_active_jobs(self) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(f"{self.base_url}/api/system/active_jobs")
                return resp.json()
            except Exception:
                return []

    async def get_report(self, run_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/api/runs/{run_id}")
            return resp.json()

    async def stream_run_events(self, run_id: str):
        """Yields events from the SSE stream for a specific run."""
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("GET", f"{self.base_url}/api/runs/{run_id}/events") as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        yield json.loads(line[6:])

    async def test_connection(self) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(f"{self.base_url}/health")
                return resp.status_code == 200
            except Exception:
                return False
