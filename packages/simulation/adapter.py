"""
SimulationAdapter — MiroFish-inspired scenario simulation using pure LLM calls.

Pipeline:
  1. Ingest seeds → extract entities, claims, themes
  2. Generate agent personas from seed entities
  3. Run multi-round scenario exploration (structured debate)
     - Between rounds: multi-source tool-calling + fact-verification
     - Agent-Reach integration: Twitter, Reddit, YouTube, GitHub, Web
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

    def request_tool_calls(self, question: str, round_num: int, context_summary: str, available_tools: list[dict]) -> list[dict]:
        """Ask the LLM what tools to call for multi-source verification.
        
        Returns a LIST of tool calls (not just one) so the agent can
        cross-verify information across Twitter, Reddit, web, etc.
        """
        if not available_tools:
            return []

        # Categorize tools for the LLM to understand
        tools_by_category = {}
        for t in available_tools:
            cat = t.get('category', 'other')
            if cat not in tools_by_category:
                tools_by_category[cat] = []
            tools_by_category[cat].append(t)

        tools_desc = ""
        for cat, tools in tools_by_category.items():
            tools_desc += f"\n[{cat.upper()}]\n"
            for t in tools:
                tools_desc += f"  - {t['id']}: {t['description']}\n"

        prompt = f"""You are a research coordinator preparing for round {round_num} of a debate.

Research Question: {question}

Current discussion summary: {context_summary[:1500]}

Available research tools (organized by category):
{tools_desc}

Your job: SELECT 1-3 tools to gather fresh, diverse data. Prioritize:
1. At least ONE social source (twitter_search, reddit_search) for public opinion
2. At least ONE factual source (web_search, web_reader, github_search) for verification
3. Use youtube_search or arxiv if the topic involves tutorials, demos, or academic research

If you truly have enough information already, respond with {{"skip": true}}.

Respond in JSON only:
{{
  "skip": false,
  "tool_calls": [
    {{"tool_id": "twitter_search", "query": "specific search", "reason": "why this source"}},
    {{"tool_id": "web_search", "query": "specific search", "reason": "why this source"}}
  ]
}}"""
        resp = chat([
            {"role": "system", "content": "You are a multi-source research coordinator. Always gather from diverse sources for cross-verification. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ], temperature=0.3, max_tokens=400)

        result = safe_parse_json(resp, fallback={"skip": True})
        if result.get("skip", False):
            return []
        return result.get("tool_calls", [])

    def verify_claims(self, claims: list[str], tool_caller, log=None, emit=None) -> str:
        """Cross-verify claims from a debate round using multiple Agent-Reach tools.
        
        Takes key claims from the debate and checks them against real-world
        sources (Twitter sentiment, Reddit discussions, web facts).
        Returns a verification summary to inject into the next round.
        """
        if not claims or not tool_caller:
            return ""

        # Ask LLM which claims need verification and what tools to use
        prompt = f"""These claims were made during a research debate. Identify the top 2 claims
that most need fact-checking and suggest the best tool + query to verify each.

Claims:
{json.dumps(claims[:8])}

Available tools:
{json.dumps([{'id': t['id'], 'desc': t['description'][:80]} for t in tool_caller['tools_info']])}

Respond in JSON:
{{
  "verifications": [
    {{"claim": "the claim", "tool_id": "best_tool", "query": "verification query"}}
  ]
}}"""
        resp = chat([
            {"role": "system", "content": "You are a fact-checker. Pick tools wisely for verification. JSON only."},
            {"role": "user", "content": prompt}
        ], temperature=0.2, max_tokens=300)

        plan = safe_parse_json(resp, fallback={"verifications": []})
        verifications = plan.get("verifications", [])

        if not verifications:
            return ""

        results = []
        for v in verifications[:2]:  # Max 2 verification checks per round
            tool_id = v.get("tool_id")
            query = v.get("query")
            claim = v.get("claim", "")
            if not tool_id or not query:
                continue

            if log:
                log(f"    🔍 Verifying: \"{claim[:60]}...\" via {tool_id}")
            if emit:
                emit("claim_verification", {
                    "claim": claim[:100],
                    "toolId": tool_id,
                    "query": query,
                })

            tool_result = tool_caller["execute"](tool_id, query)
            results.append(
                f"[VERIFICATION — {tool_id}]\n"
                f"Claim: {claim}\n"
                f"Evidence: {tool_result[:600]}"
            )
            if log:
                log(f"    ✓ Verification returned {len(tool_result)} chars")

        return "\n\n".join(results)

    # ── Step 3: Run scenario exploration (with tools) ─

    def run_scenarios(self, question: str, context: dict, personas: list[dict],
                      tool_caller=None, live_feed=None, log=None, emit=None, check_stop=None) -> tuple:
        """Run multi-round scenario exploration with real-time tool usage."""
        persona_desc = "\n".join([
            f"- **{p.get('name', 'Agent')}**: {p.get('perspective', '')} (expertise: {p.get('expertise', '')})"
            for p in personas[:self.config.num_agents]
        ])

        all_rounds = []
        round_num = 1
        
        import time
        
        while True:
            if check_stop and check_stop():
                if log:
                    log("Simulation stopped by user.")
                break

            if not self.config.endless_mode and round_num > self.config.num_rounds:
                break

            if log:
                log(f"  Round {round_num}{' (Endless)' if self.config.endless_mode else f'/{self.config.num_rounds}'}...")

            tools_used = False
            live_items_added = False
            round_intel = []

            # --- Multi-source tool-calling between rounds (Agent-Reach) ---
            if tool_caller and round_num > 1:
                context_so_far = json.dumps(all_rounds[-1:], indent=1)[:800] if all_rounds else "No prior rounds"
                
                # 1. Gather fresh intelligence from multiple sources
                tool_requests = self.request_tool_calls(question, round_num, context_so_far, tool_caller["tools_info"])
                for tool_request in tool_requests:
                    tool_id = tool_request.get("tool_id")
                    tool_query = tool_request.get("query")
                    reason = tool_request.get("reason", "")
                    if not tool_id or not tool_query:
                        continue

                    tools_used = True
                    if log:
                        log(f"    🔧 [{tool_id}] → \"{tool_query}\" ({reason})")
                    if emit:
                        emit("tool_called", {
                            "toolId": tool_id,
                            "query": tool_query,
                            "reason": reason,
                            "round": round_num,
                        })
                    tool_result = tool_caller["execute"](tool_id, tool_query)
                    round_intel.append(f"[{tool_id.upper()}] {tool_result[:800]}")
                    if log:
                        log(f"    ✓ Got {len(tool_result)} chars from {tool_id}")
                    if emit:
                        emit("tool_result", {
                            "toolId": tool_id,
                            "query": tool_query,
                            "resultPreview": tool_result[:200],
                            "round": round_num,
                        })

                # 2. Verify claims from the previous round
                if all_rounds:
                    prev_claims = all_rounds[-1].get("key_points", [])
                    verification = self.verify_claims(prev_claims, tool_caller, log, emit)
                    if verification:
                        round_intel.append(f"\n--- FACT-CHECK RESULTS ---\n{verification}")

            # --- Live feed injection ---
            if live_feed:
                items = live_feed.pull_items()
                for item in items:
                    live_items_added = True
                    round_intel.append(item.to_context_str())
                    if log:
                        log(f"    📡 Live data: {item.title[:60]}")
                    if emit:
                        emit("live_data_received", {
                            "title": item.title,
                            "sourceType": item.source_type,
                            "url": item.url,
                            "round": round_num,
                        })

            # Check if we should idle in Endless Mode
            if self.config.endless_mode and not tools_used and not live_items_added and round_num > 1:
                if log:
                    log("    💤 Idling... waiting for live data.")
                time.sleep(5)
                # Skip the heavy LLM debate round if no fresh data arrived
                continue

            # --- Generate this Round's Debate ---
            intel_section = ""
            if round_intel:
                intel_section = f"""
FRESH INTELLIGENCE FOR THIS ROUND:
{chr(10).join(round_intel)}

Incorporate this fresh intelligence directly into the current debate.
IMPORTANT: If any fact-check results contradict earlier claims, agents MUST address this."""

            prompt = f"""You are orchestrating round {round_num} of a {self.config.debate_style} discussion with {self.config.num_agents} agents.

Research Question: {question}

Key Context:
- Claims: {json.dumps(context.get('claims', [])[:5])}
- Themes: {json.dumps(context.get('themes', [])[:5])}

Participating Agents:
{persona_desc}

Previous Round Summary (if any):
{json.dumps(all_rounds[-1:] if all_rounds else 'None')}
{intel_section}

For this round, agents should challenge assumptions and build on ideas.
Output ONLY valid JSON for this single round:
{{
  "round": {round_num},
  "key_points": ["..."],
  "disagreements": ["..."],
  "emerging_consensus": "..."
}}"""
            resp = chat([
                {"role": "system", "content": "You are a research simulation engine generating a single round of agent debate. Output valid JSON only."},
                {"role": "user", "content": prompt}
            ], temperature=0.7, max_tokens=1000)

            round_data = safe_parse_json(resp, fallback={
                "round": round_num, 
                "key_points": ["Simulation error"], 
                "disagreements": [], 
                "emerging_consensus": "Error generating round"
            })
            all_rounds.append(round_data)
            round_num += 1

        # Now generate the final scenario synthesis
        prompt = f"""Based on the {len(all_rounds)} rounds of structured debate, synthesize the outcome into scenario branches.

Research Question: {question}

Full Debate Summary:
{json.dumps(all_rounds, indent=1)[:6000]}

INSTRUCTIONS FOR SCENARIOS:
1. If the question asks to compare multiple entities (e.g., "who will win the tournament", "which stock will perform best"), generate one scenario branch PER ENTITY (e.g., one for each team), outlining their specific chance of winning and the key drivers behind it. Ensure the total probability percentage across all mutually exclusive entities adds up to roughly 100.
2. If the question is a Yes/No or binary outcome (e.g., "will the market crash"), generate two main scenarios: one for Yes, one for No, with their respective percentage probabilities.
3. For open-ended generative questions, generate 3-5 distinct plausible futures.

Respond in JSON format only, no extra text:
{{
  "scenarios": [
    {{
      "id": "S1",
      "title": "...",
      "description": "Detailed explanation of the scenario",
      "probability_percentage": 75,
      "key_drivers": ["..."],
      "risks": ["..."],
      "opportunities": ["..."]
    }}
  ],
  "key_findings": ["..."],
  "unresolved_questions": ["..."]
}}"""
        resp = chat([
            {"role": "system", "content": "You are a research simulation engine. Produce structured multi-scenario analysis based on the debate rounds. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ], temperature=0.8, max_tokens=4096)

        final_data = safe_parse_json(resp, fallback={"scenarios": [], "key_findings": [], "unresolved_questions": []})
        final_data["rounds"] = all_rounds
        return final_data.get("scenarios", []), final_data

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
            tool_caller=None, live_feed_manager=None, check_stop=None) -> dict:
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
            check_stop=check_stop,
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
