"""
ResearchLoopRunner — autoresearch-inspired controlled self-improvement loop.

Pattern: baseline config → mutate to challenger → run both → evaluate → keep/discard.
"""

from __future__ import annotations
import json
import copy
import random
from packages.core.llm import chat
from packages.core.schemas import SimConfig
from packages.core.json_repair import safe_parse_json


class ResearchLoopRunner:
    """Generates challenger configs by mutating a baseline."""

    MUTATION_PROMPT = """You are a research configuration optimizer. Given a baseline simulation config,
propose ONE mutation that might improve research output quality.

Current baseline config:
{config}

Recent experiment results (if any):
{history}

Propose a single change to one or more of these parameters:
- num_agents (current: {num_agents}) — range 4-16
- num_rounds (current: {num_rounds}) — range 4-20
- debate_style (current: {debate_style}) — options: structured, freeform, adversarial, collaborative
- critique_strength (current: {critique_strength}) — options: light, medium, strong, aggressive
- report_template (current: {report_template}) — options: standard, detailed, executive, academic

Respond in JSON only, no extra text:
{{
  "mutation_description": "What you changed and why",
  "config_changes": {{
    "num_agents": ...,
    "num_rounds": ...,
    "debate_style": "...",
    "critique_strength": "...",
    "report_template": "..."
  }}
}}"""

    def propose_challenger(self, baseline: SimConfig, history: list[dict] | None = None) -> SimConfig:
        """Generate a challenger config by mutating the baseline."""
        hist_str = json.dumps(history[-5:], indent=2) if history else "No previous experiments"

        prompt = self.MUTATION_PROMPT.format(
            config=baseline.model_dump_json(indent=2),
            history=hist_str,
            num_agents=baseline.num_agents,
            num_rounds=baseline.num_rounds,
            debate_style=baseline.debate_style,
            critique_strength=baseline.critique_strength,
            report_template=baseline.report_template,
        )

        resp = chat([
            {"role": "system", "content": "You are a research config optimizer. Always respond with valid JSON only, no extra text."},
            {"role": "user", "content": prompt}
        ], temperature=0.8)

        data = safe_parse_json(resp, fallback={"config_changes": {}, "mutation_description": "Random perturbation"})


        changes = data.get("config_changes", {})
        # Create a copy with mutations
        challenger = SimConfig(
            project_id=baseline.project_id,
            label=f"challenger: {data.get('mutation_description', 'mutation')[:60]}",
            num_agents=int(changes.get("num_agents", baseline.num_agents)),
            num_rounds=int(changes.get("num_rounds", baseline.num_rounds)),
            debate_style=str(changes.get("debate_style", baseline.debate_style)),
            critique_strength=str(changes.get("critique_strength", baseline.critique_strength)),
            report_template=str(changes.get("report_template", baseline.report_template)),
            is_baseline=False,
        )

        # Clamp values
        challenger.num_agents = max(4, min(16, challenger.num_agents))
        challenger.num_rounds = max(4, min(20, challenger.num_rounds))

        return challenger
