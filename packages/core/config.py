"""ResearchForge core config — loads .env and provides settings."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Walk upward to find .env in repo root
_root = Path(__file__).resolve().parent.parent.parent
_env_path = _root / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=True)


class Settings:
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "http://localhost:1234/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "local-model")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "not-needed")
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_root}/workspaces/researchforge.db")
    MAX_AGENTS: int = int(os.getenv("MAX_AGENTS", "8"))
    MAX_ROUNDS: int = int(os.getenv("MAX_ROUNDS", "10"))
    WORKSPACES_DIR: str = str(_root / "workspaces")


settings = Settings()
