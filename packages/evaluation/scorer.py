"""
Evaluator — Multi-dimension rubric scorer for research reports.

Scores on 6 dimensions:
  1. Usefulness — practical value for decision-making
  2. Consistency — internal logical coherence
  3. Grounding — fidelity to provided seed materials
  4. Diversity — range of perspectives and scenarios
  5. Clarity — structure, readability, actionability
  6. Novelty — non-obvious insights without hallucination
"""

from __future__ import annotations
import json
from packages.core.llm import chat
from packages.core.schemas import EvalScore, CompareResult


class Evaluator:
    """Score research reports using an LLM rubric."""

    RUBRIC_PROMPT = """You are a research quality evaluator. Score this report on 6 dimensions (0-10 each):

1. **Usefulness** — How practical is this for making real decisions?
2. **Consistency** — Are the scenarios internally coherent?
3. **Grounding** — Does it stay faithful to the provided seed materials?
4. **Diversity** — Does it cover a wide range of perspectives?
5. **Clarity** — Is it well-structured and easy to understand?
6. **Novelty** — Does it surface non-obvious insights (without hallucinating)?

Research Question: {question}

Report:
{report}

Respond ONLY with JSON:
{{
  "usefulness": 7.5,
  "consistency": 8.0,
  "grounding": 6.5,
  "diversity": 7.0,
  "clarity": 8.5,
  "novelty": 6.0,
  "reasoning": "Brief explanation of scores"
}}"""

    def score(self, question: str, report_md: str) -> EvalScore:
        """Score a single report."""
        prompt = self.RUBRIC_PROMPT.format(
            question=question,
            report=report_md[:4000]
        )
        resp = chat([
            {"role": "system", "content": "You are a strict research evaluator. Score fairly. Always respond with valid JSON."},
            {"role": "user", "content": prompt}
        ], temperature=0.2)
        try:
            data = json.loads(resp)
        except json.JSONDecodeError:
            start = resp.find("{")
            end = resp.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(resp[start:end])
            else:
                data = {}

        return EvalScore(
            usefulness=float(data.get("usefulness", 5.0)),
            consistency=float(data.get("consistency", 5.0)),
            grounding=float(data.get("grounding", 5.0)),
            diversity=float(data.get("diversity", 5.0)),
            clarity=float(data.get("clarity", 5.0)),
            novelty=float(data.get("novelty", 5.0)),
        )

    def compare(self, question: str, baseline_md: str, challenger_md: str,
                baseline_run_id: str, challenger_run_id: str) -> CompareResult:
        """Score both reports and determine winner."""
        baseline_score = self.score(question, baseline_md)
        challenger_score = self.score(question, challenger_md)

        b_comp = baseline_score.composite
        c_comp = challenger_score.composite

        if c_comp > b_comp + 0.3:
            winner = "challenger"
            rec = "Challenger shows meaningful improvement. Recommend promotion."
        elif b_comp > c_comp + 0.3:
            winner = "baseline"
            rec = "Baseline remains stronger. Keep current configuration."
        else:
            winner = "tie"
            rec = "No significant difference. Consider keeping baseline for stability."

        delta = {
            dim: round(getattr(challenger_score, dim) - getattr(baseline_score, dim), 2)
            for dim in ["usefulness", "consistency", "grounding", "diversity", "clarity", "novelty"]
        }

        return CompareResult(
            baseline_run_id=baseline_run_id,
            challenger_run_id=challenger_run_id,
            baseline_score=baseline_score,
            challenger_score=challenger_score,
            winner=winner,
            delta=delta,
            recommendation=rec,
        )
