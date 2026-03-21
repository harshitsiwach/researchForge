"""ResearchForge core schemas — Pydantic models shared across all packages."""

from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import uuid


def new_id(prefix: str = "") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}" if prefix else uuid.uuid4().hex[:12]


# ── Enums ──────────────────────────────────────────────

class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class RunMode(str, Enum):
    EXPLORE = "explore"
    DECISION = "decision"
    COMPARE = "compare"
    IMPROVE = "improve"


# ── Core Models ────────────────────────────────────────

class Workspace(BaseModel):
    id: str = Field(default_factory=lambda: new_id("ws"))
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Project(BaseModel):
    id: str = Field(default_factory=lambda: new_id("proj"))
    workspace_id: str
    name: str
    question: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Seed(BaseModel):
    id: str = Field(default_factory=lambda: new_id("seed"))
    project_id: str
    filename: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SimConfig(BaseModel):
    """A simulation configuration — mutable between baseline and challenger."""
    id: str = Field(default_factory=lambda: new_id("cfg"))
    project_id: str
    label: str = "default"
    num_agents: int = 6
    num_rounds: int = 8
    debate_style: str = "structured"
    critique_strength: str = "medium"
    report_template: str = "standard"
    extra: dict = Field(default_factory=dict)
    is_baseline: bool = False
    promoted_at: Optional[datetime] = None


class Run(BaseModel):
    id: str = Field(default_factory=lambda: new_id("run"))
    project_id: str
    config_id: str
    mode: RunMode = RunMode.EXPLORE
    status: RunStatus = RunStatus.PENDING
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    log: str = ""
    error: Optional[str] = None


class EvalScore(BaseModel):
    usefulness: float = 0.0
    consistency: float = 0.0
    grounding: float = 0.0
    diversity: float = 0.0
    clarity: float = 0.0
    novelty: float = 0.0

    @property
    def composite(self) -> float:
        vals = [self.usefulness, self.consistency, self.grounding,
                self.diversity, self.clarity, self.novelty]
        return sum(vals) / len(vals) if vals else 0.0


class Report(BaseModel):
    id: str = Field(default_factory=lambda: new_id("rpt"))
    run_id: str
    title: str = ""
    content_md: str = ""
    scenarios: list[dict] = Field(default_factory=list)
    eval_score: Optional[EvalScore] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CompareResult(BaseModel):
    baseline_run_id: str
    challenger_run_id: str
    baseline_score: EvalScore
    challenger_score: EvalScore
    winner: str  # "baseline" | "challenger" | "tie"
    delta: dict = Field(default_factory=dict)
    recommendation: str = ""
