"""
SimulationAdapter — MiroFish-inspired scenario simulation using pure LLM calls.

Pipeline:
  1. Ingest seeds → extract entities, claims, themes
  2. Generate agent personas from seed entities
  3. Run multi-round scenario exploration (structured debate)
  4. Synthesize final scenario bundle as a report
"""

from __future__ import annotations
import json
from packages.core.llm import chat
from packages.core.schemas import SimConfig


class SimulationAdapter:
    """Runs a full simulation pipeline against a local LLM."""

    def __init__(self, config: SimConfig):
        self.config = config

    # ── Step 1: Extract seed context ──────────────────

    def extract_context(self, seeds: list[str]) -> dict:
        """Extract entities, claims, and themes from seed texts."""
        combined = "\n\n---\n\n".join(seeds)
        prompt = f"""Analyze the following seed materials and extract:
1. Key entities (people, organizations, concepts, technologies)
2. Main claims or hypotheses
3. Central themes
4. Potential tensions or conflicts

Seed materials:
{combined[:6000]}

Respond in JSON format:
{{
  "entities": ["..."],
  "claims": ["..."],
  "themes": ["..."],
  "tensions": ["..."]
}}"""
        resp = chat([
            {"role": "system", "content": "You are a research analyst. Extract structured information from seed materials. Always respond with valid JSON."},
            {"role": "user", "content": prompt}
        ], temperature=0.3)
        try:
            return json.loads(resp)
        except json.JSONDecodeError:
            # Try to find JSON in the response
            start = resp.find("{")
            end = resp.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(resp[start:end])
                except json.JSONDecodeError:
                    pass
            return {"entities": [], "claims": [], "themes": [], "tensions": []}

    # ── Step 2: Generate agent personas ───────────────

    def generate_personas(self, context: dict) -> list[dict]:
        """Generate diverse agent personas based on extracted context."""
        prompt = f"""Based on this research context, generate {self.config.num_agents} diverse agent personas
who would have different perspectives on these topics.

Context:
- Entities: {json.dumps(context.get('entities', []))}
- Themes: {json.dumps(context.get('themes', []))}
- Tensions: {json.dumps(context.get('tensions', []))}

For each persona, provide:
- name: a descriptive role name
- perspective: their viewpoint
- expertise: their domain knowledge
- bias: what they tend to emphasize or overlook

Respond as a JSON array of persona objects."""
        resp = chat([
            {"role": "system", "content": "You generate diverse research agent personas. Always respond with valid JSON array."},
            {"role": "user", "content": prompt}
        ], temperature=0.7)
        try:
            return json.loads(resp)
        except json.JSONDecodeError:
            start = resp.find("[")
            end = resp.rfind("]") + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(resp[start:end])
                except json.JSONDecodeError:
                    pass
            return [{"name": "Default Analyst", "perspective": "General", "expertise": "Research", "bias": "None"}]

    # ── Step 3: Run scenario exploration ──────────────

    def run_scenarios(self, question: str, context: dict, personas: list[dict]) -> list[dict]:
        """Run multi-round scenario exploration."""
        persona_desc = "\n".join([
            f"- **{p.get('name', 'Agent')}**: {p.get('perspective', '')} (expertise: {p.get('expertise', '')})"
            for p in personas[:self.config.num_agents]
        ])

        prompt = f"""You are orchestrating a structured scenario exploration with {self.config.num_agents} agents.

Research Question: {question}

Key Context:
- Claims: {json.dumps(context.get('claims', [])[:5])}
- Themes: {json.dumps(context.get('themes', [])[:5])}
- Tensions: {json.dumps(context.get('tensions', [])[:5])}

Participating Agents:
{persona_desc}

Run {self.config.num_rounds} rounds of {self.config.debate_style} debate with {self.config.critique_strength} critique.

For each round, agents should:
1. Propose scenario branches (what could happen)
2. Challenge each other's assumptions
3. Identify blind spots
4. Build on strong ideas

After all rounds, generate 3-5 distinct scenario branches showing different plausible futures.

Respond in JSON format:
{{
  "rounds": [
    {{
      "round": 1,
      "key_points": ["..."],
      "disagreements": ["..."],
      "emerging_consensus": "..."
    }}
  ],
  "scenarios": [
    {{
      "id": "S1",
      "title": "...",
      "description": "...",
      "probability_assessment": "high/medium/low",
      "key_drivers": ["..."],
      "risks": ["..."],
      "opportunities": ["..."]
    }}
  ],
  "key_findings": ["..."],
  "unresolved_questions": ["..."]
}}"""
        resp = chat([
            {"role": "system", "content": "You are a research simulation engine. Produce structured multi-scenario analysis. Always respond with valid JSON."},
            {"role": "user", "content": prompt}
        ], temperature=0.8, max_tokens=4096)
        try:
            result = json.loads(resp)
            return result.get("scenarios", []), result
        except json.JSONDecodeError:
            start = resp.find("{")
            end = resp.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    result = json.loads(resp[start:end])
                    return result.get("scenarios", []), result
                except json.JSONDecodeError:
                    pass
            return [], {"scenarios": [], "key_findings": [], "rounds": []}

    # ── Step 4: Compose report ────────────────────────

    def compose_report(self, question: str, scenarios_data: dict) -> str:
        """Turn raw scenario data into a readable markdown report."""
        prompt = f"""Convert this scenario analysis into a polished research report in Markdown.

Research Question: {question}

Raw Data:
{json.dumps(scenarios_data, indent=2)[:4000]}

The report should include:
1. Executive Summary
2. Methodology (multi-agent simulation with {self.config.num_agents} agents, {self.config.num_rounds} rounds)
3. Key Findings
4. Scenario Branches (each with title, description, drivers, risks, opportunities)
5. Disagreements & Unresolved Questions
6. Recommendations

⚠️ Label all outputs as simulated scenarios, not predictions.
Use clear headers, bullet points, and structured formatting."""
        return chat([
            {"role": "system", "content": "You are a research report composer. Write clear, structured, evidence-aware reports. Label outputs as scenarios, not facts."},
            {"role": "user", "content": prompt}
        ], temperature=0.5, max_tokens=4096)

    def run(self, question: str, seeds: list[str], log_callback=None, event_callback=None) -> dict:
        """Execute the full simulation pipeline."""
        import time
        from packages.core.schemas import new_id
        
        sim_id = f"sim_{int(time.time())}"

        def log(msg: str):
            if log_callback:
                log_callback(msg)

        def emit(event_type: str, data: dict):
            if event_callback:
                payload = {
                    "eventId": new_id("evt"),
                    "timestamp": time.time(),
                    "simulationId": sim_id,
                    "type": event_type,
                    "source": "adapter",
                    **data
                }
                event_callback(payload)

        emit("simulation_started", {"question": question})

        log("Extracting context from seed materials...")
        emit("agent_state_changed", {"agentRole": "system", "state": "reading", "message": "Extracting context..."})
        context = self.extract_context(seeds)
        log(f"Found {len(context.get('entities', []))} entities, {len(context.get('themes', []))} themes")

        log(f"Generating {self.config.num_agents} agent personas...")
        emit("simulation_progress", {"phase": "personas"})
        personas = self.generate_personas(context)
        log(f"Created {len(personas)} personas")
        
        for p in personas[:self.config.num_agents]:
            emit("agent_spawned", {
                "agentId": new_id("agt"),
                "agentRole": p.get("name", "Agent"),
                "agentName": p.get("name", "Agent"),
                "state": "idle"
            })

        log(f"Running {self.config.num_rounds}-round scenario exploration...")
        emit("agent_debate_started", {"message": f"Starting {self.config.num_rounds} rounds of debate."})
        scenarios, raw_data = self.run_scenarios(question, context, personas)
        log(f"Generated {len(scenarios)} scenario branches")
        emit("agent_debate_finished", {"scenariosCount": len(scenarios)})

        log("Composing research report...")
        emit("agent_state_changed", {"agentRole": "system", "state": "writing", "message": "Composing report..."})
        report_md = self.compose_report(question, raw_data)
        log("Report complete")
        emit("artifact_created", {"artifactId": "report_md"})

        emit("simulation_finished", {})

        return {
            "context": context,
            "personas": personas,
            "scenarios": scenarios,
            "raw_data": raw_data,
            "report_md": report_md,
        }
