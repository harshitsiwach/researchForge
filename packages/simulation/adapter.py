"""
SimulationAdapter — MiroFish-inspired scenario simulation using pure LLM calls.

Pipeline:
  1. Ingest seeds → extract entities, claims, themes
  2. Generate agent personas from seed entities
  3. Run multi-round scenario exploration (structured debate)
     - Between rounds: tool-calling + live data injection
  4. Synthesize final scenario bundle as a report
"""

from __future__ import annotations
import json
from packages.core.llm import chat
from packages.core.schemas import SimConfig
from packages.core.json_repair import safe_parse_json


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
            {"role": "system", "content": "You are a research analyst. Extract structured information from seed materials. Always respond with valid JSON only, no extra text."},
            {"role": "user", "content": prompt}
        ], temperature=0.3)

        result = safe_parse_json(resp, fallback=None)
        if result and isinstance(result, dict):
            return result
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

Respond as a JSON array of persona objects. No extra text outside the JSON."""
        resp = chat([
            {"role": "system", "content": "You generate diverse research agent personas. Always respond with valid JSON array only, no extra text."},
            {"role": "user", "content": prompt}
        ], temperature=0.7)

        result = safe_parse_json(resp, fallback=None)
        if result and isinstance(result, list):
            return result
        return [{"name": "Default Analyst", "perspective": "General", "expertise": "Research", "bias": "None"}]

    # ── Step 2.5: Tool-calling between rounds ─────────

    def request_tool_call(self, question: str, round_num: int, context_summary: str, available_tools: list[dict]) -> dict | None:
        """Ask the LLM what tool to call to gather more info for the next round."""
        if not available_tools:
            return None

        tools_desc = "\n".join([
            f"- {t['id']}: {t['description']}"
            for t in available_tools
        ])

        prompt = f"""You are a research coordinator preparing for round {round_num} of a debate.

Research Question: {question}

Current discussion summary: {context_summary[:1000]}

Available tools:
{tools_desc}

Should you use a tool to gather more information? If yes, pick ONE tool and provide a search query.
If you have enough information, respond with {{"skip": true}}.

Respond in JSON only:
{{
  "skip": false,
  "tool_id": "web_search",
  "query": "your search query here"
}}"""
        resp = chat([
            {"role": "system", "content": "You are a research coordinator deciding what data to gather. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ], temperature=0.3, max_tokens=200)

        result = safe_parse_json(resp, fallback={"skip": True})
        if result.get("skip", False):
            return None
        return result

    # ── Step 3: Run scenario exploration (with tools) ─

    def run_scenarios(self, question: str, context: dict, personas: list[dict],
                      tool_caller=None, live_feed=None, log=None, emit=None) -> tuple:
        """Run multi-round scenario exploration with real-time tool usage."""
        persona_desc = "\n".join([
            f"- **{p.get('name', 'Agent')}**: {p.get('perspective', '')} (expertise: {p.get('expertise', '')})"
            for p in personas[:self.config.num_agents]
        ])

        # Accumulate extra intel gathered from tools and live feeds
        extra_intel = []

        # Run individual rounds with tool-calling between them
        all_rounds = []
        for round_num in range(1, self.config.num_rounds + 1):
            if log:
                log(f"  Round {round_num}/{self.config.num_rounds}...")

            # --- Tool-calling between rounds ---
            if tool_caller and round_num > 1:
                context_so_far = json.dumps(all_rounds[-1:], indent=1)[:500] if all_rounds else "No prior rounds"
                tool_request = self.request_tool_call(question, round_num, context_so_far, tool_caller["tools_info"])
                if tool_request and tool_request.get("tool_id") and tool_request.get("query"):
                    tool_id = tool_request["tool_id"]
                    tool_query = tool_request["query"]
                    if log:
                        log(f"    🔧 Calling tool: {tool_id} → \"{tool_query}\"")
                    if emit:
                        emit("tool_called", {
                            "toolId": tool_id,
                            "query": tool_query,
                            "round": round_num,
                        })
                    # Execute the tool
                    tool_result = tool_caller["execute"](tool_id, tool_query)
                    extra_intel.append(f"[Tool: {tool_id}] {tool_result[:800]}")
                    if log:
                        log(f"    ✓ Got {len(tool_result)} chars from {tool_id}")
                    if emit:
                        emit("tool_result", {
                            "toolId": tool_id,
                            "query": tool_query,
                            "resultPreview": tool_result[:200],
                            "round": round_num,
                        })

            # --- Live feed injection ---
            if live_feed:
                items = live_feed.pull_items()
                for item in items:
                    extra_intel.append(item.to_context_str())
                    if log:
                        log(f"    📡 Live data: {item.title[:60]}")
                    if emit:
                        emit("live_data_received", {
                            "title": item.title,
                            "sourceType": item.source_type,
                            "url": item.url,
                            "round": round_num,
                        })

        # Now generate the full scenario analysis in one LLM call
        # (including all the extra intel gathered)
        intel_section = ""
        if extra_intel:
            intel_section = f"""

ADDITIONAL REAL-TIME INTELLIGENCE GATHERED DURING RESEARCH:
{chr(10).join(extra_intel[:10])}

Use this fresh intelligence to inform and ground your analysis."""

        prompt = f"""You are orchestrating a structured scenario exploration with {self.config.num_agents} agents.

Research Question: {question}

Key Context:
- Claims: {json.dumps(context.get('claims', [])[:5])}
- Themes: {json.dumps(context.get('themes', [])[:5])}
- Tensions: {json.dumps(context.get('tensions', [])[:5])}

Participating Agents:
{persona_desc}

Run {self.config.num_rounds} rounds of {self.config.debate_style} debate with {self.config.critique_strength} critique.
{intel_section}

For each round, agents should:
1. Propose scenario branches (what could happen)
2. Challenge each other's assumptions
3. Identify blind spots
4. Build on strong ideas

After all rounds, generate 3-5 distinct scenario branches showing different plausible futures.

Respond in JSON format only, no extra text:
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
            {"role": "system", "content": "You are a research simulation engine. Produce structured multi-scenario analysis. Always respond with valid JSON only, no extra text."},
            {"role": "user", "content": prompt}
        ], temperature=0.8, max_tokens=4096)

        result = safe_parse_json(resp, fallback=None)
        if result and isinstance(result, dict):
            return result.get("scenarios", []), result
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

    # ── Main Pipeline ─────────────────────────────────

    def run(self, question: str, seeds: list[str], log_callback=None, event_callback=None,
            tool_caller=None, live_feed_manager=None) -> dict:
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

        # Start live feed if configured
        if live_feed_manager:
            live_feed_manager.start()
            log("📡 Live data feeds started")
            emit("live_feed_started", {"sources": len(live_feed_manager.sources)})

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
        if tool_caller:
            log(f"🔧 Tools enabled: {len(tool_caller.get('tools_info', []))} tools available")
        emit("agent_debate_started", {"message": f"Starting {self.config.num_rounds} rounds of debate."})

        scenarios, raw_data = self.run_scenarios(
            question, context, personas,
            tool_caller=tool_caller,
            live_feed=live_feed_manager,
            log=log,
            emit=emit,
        )
        log(f"Generated {len(scenarios)} scenario branches")
        emit("agent_debate_finished", {"scenariosCount": len(scenarios)})

        # Stop live feed
        if live_feed_manager:
            live_feed_manager.stop()
            log("📡 Live data feeds stopped")

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
