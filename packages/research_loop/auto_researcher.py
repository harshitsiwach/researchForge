"""
Autonomous Researcher Agent (Milestone 9)

This module implements the Master Orchestrator loop that researches a topic,
synthesizes a draft, and spawns a Simulation (peer-review) to refine its findings.
"""

import time
import json
from packages.core.llm import chat
from packages.core.json_repair import safe_parse_json
from packages.simulation.adapter import SimulationAdapter
from packages.core.schemas import SimConfig, new_id
from packages.tools.registry import get_enabled_tools, execute_tool

class AutoResearcher:
    def __init__(self, job_id: str, project_id: str, log_cb=None, event_cb=None, check_stop_cb=None):
        self.job_id = job_id
        self.project_id = project_id
        self.log = log_cb or (lambda x: None)
        self.emit = event_cb or (lambda t, d: None)
        self.check_stop = check_stop_cb or (lambda: False)
        self.working_draft = ""
        self.tools = get_enabled_tools()

    def run(self, topic: str):
        self.log(f"Starting Auto-Researcher on topic: {topic}")
        self.emit("researcher_status_changed", {"status": "planning", "message": "Analyzing topic and planning tools..."})

        loop_count = 0
        max_loops = 3  # Prevent truly infinite loops for safety

        while loop_count < max_loops:
            loop_count += 1
            if self.check_stop():
                self.log("Auto-Researcher stopped manually.")
                break

            self.log(f"--- Research Cycle {loop_count} ---")
            
            # Step 1: Tool Use / Investigation
            self.emit("researcher_status_changed", {"status": "researching", "message": "Gathering data via tools..."})
            findings = self._gather_data(topic)

            if self.check_stop(): break

            # Step 2: Drafting
            self.emit("researcher_status_changed", {"status": "drafting", "message": "Synthesizing findings into working draft..."})
            self.working_draft = self._synthesize_draft(topic, findings)
            self.emit("draft_updated", {"draft": self.working_draft})

            if self.check_stop(): break

            # Step 3: Peer Review (Simulation)
            self.emit("researcher_status_changed", {"status": "simulating", "message": "Spawning Peer-Review Simulation..."})
            critique = self._run_peer_review_simulation(topic)

            if self.check_stop(): break

            # Step 4: Refinement Decision
            self.emit("researcher_status_changed", {"status": "refining", "message": "Reviewing critique and deciding next steps..."})
            needs_more, final_draft = self._refine_draft(topic, critique)
            self.working_draft = final_draft
            self.emit("draft_updated", {"draft": self.working_draft})

            if not needs_more:
                self.log("Research deemed complete by the orchestrator.")
                break

        self.log("Auto-Researcher finished.")
        self.emit("researcher_finished", {"final_draft": self.working_draft})
        return self.working_draft

    def _gather_data(self, topic: str) -> str:
        """Use Agent-Reach tools to gather info from multiple internet sources."""
        # Categorize tools for smarter selection
        social_tools = [t for t in self.tools if t.category == "social"]
        search_tools = [t for t in self.tools if t.category == "search"]
        fetch_tools = [t for t in self.tools if t.category == "fetch"]
        academic_tools = [t for t in self.tools if t.category == "academic"]

        all_tools = self.tools
        tools_desc = ""
        for category, tools in [("SOCIAL MEDIA", social_tools), ("SEARCH", search_tools), 
                                 ("FETCH/READ", fetch_tools), ("ACADEMIC", academic_tools)]:
            if tools:
                tools_desc += f"\n[{category}]\n"
                for t in tools:
                    tools_desc += f"  - {t.id}: {t.description}\n"

        prompt = f"""You are the Master Research Agent. Your current topic is: {topic}
You have a working draft:
{self.working_draft[:1000] if self.working_draft else '(Empty)'}

You need to gather comprehensive, multi-source data for your research.
IMPORTANT: Use tools from DIFFERENT categories to cross-verify information.
For example:
  - twitter_search + web_search = social sentiment + factual data
  - reddit_search + arxiv = community discussion + academic research
  - youtube_search + web_reader = tutorial content + documentation

Available tools:
{tools_desc}

Select 2-4 diverse tools across categories. Be strategic about search queries.

Respond in JSON only:
{{
  "thought_process": "Why you need this data and your verification strategy",
  "tool_calls": [
    {{"tool_id": "twitter_search", "query": "exact search term"}},
    {{"tool_id": "web_search", "query": "verification search term"}},
    {{"tool_id": "reddit_search", "query": "community perspective term"}}
  ]
}}"""
        resp = chat([{"role": "user", "content": prompt}], temperature=0.4)
        decision = safe_parse_json(resp, fallback={"tool_calls": []})
        
        tool_calls = decision.get("tool_calls", [])
        
        if not tool_calls or not isinstance(tool_calls, list):
            self.log("No tools selected. Proceeding with existing knowledge.")
            return "No new data gathered."

        findings = []
        for call in tool_calls[:5]:  # Safety limit of 5 tool calls per loop
            tool_id = call.get("tool_id")
            query = call.get("query")
            
            if not tool_id or not query:
                continue

            self.log(f"Executing tool '{tool_id}' with query: '{query}'")
            self.emit("tool_called", {"toolId": tool_id, "query": query})
            
            try:
                result = execute_tool(tool_id, query)
                preview = str(result)[:200] + "..." if len(str(result)) > 200 else str(result)
                self.emit("tool_result", {"toolId": tool_id, "query": query, "resultPreview": preview})
                findings.append(f"--- Tool: {tool_id} | Query: {query} ---\n{result}")
            except Exception as e:
                self.log(f"Tool {tool_id} failed: {e}")
                findings.append(f"--- Tool: {tool_id} | Query: {query} ---\nError: {e}")
                
        if not findings:
            return "No new data gathered."
            
        return "\n\n".join(findings)

    def _synthesize_draft(self, topic: str, findings: str) -> str:
        prompt = f"""You are drafting a comprehensive research report on: {topic}
        
Current Draft:
{self.working_draft if self.working_draft else '(No draft yet)'}

New Findings:
{findings}

Please rewrite or append to the Current Draft so it incorporates the New Findings. Ensure it flows logically. Return ONLY the markdown content of the updated draft."""
        return chat([{"role": "user", "content": prompt}], temperature=0.5)

    def _run_peer_review_simulation(self, topic: str) -> str:
        """Spawns a SimulationAdapter synchronously to critique the working_draft."""
        self.log("Triggering internal Simulation lobby for Peer Review...")
        
        # We use the draft as the seed material.
        # We tell the simulation the question is to "Critique this draft".
        sim_config = SimConfig(
            project_id=self.project_id,
            num_agents=3,
            num_rounds=2,
            debate_style="adversarial",
            critique_strength="aggressive"
        )
        adapter = SimulationAdapter(sim_config)
        
        # Capture sim logs strictly internally if needed, or bubble them up
        def sim_log(msg): self.log(f" [SIM] {msg}")
        def sim_emit(evt): 
            # Bubble up simulation events to the UI, tagged as mini-sim
            evt["is_mini_sim"] = True
            self.emit(evt["type"], evt)

        result = adapter.run(
            question=f"Critique and find flaws in this draft about: {topic}",
            seeds=[self.working_draft],
            log_callback=sim_log,
            event_callback=sim_emit,
            check_stop=self.check_stop
        )
        
        return result.get("report_md", "Simulation failed to produce a critique.")

    def _refine_draft(self, topic: str, critique: str) -> tuple[bool, str]:
        """Ask LLM to update draft based on critique and decide if it needs another loop."""
        prompt = f"""You are the Master Research Agent. You wrote a draft on: {topic}
        
Working Draft:
{self.working_draft}

Peer Review Critique:
{critique}

Task 1: Rewrite your Working Draft to address the valid points in the critique.
Task 2: Decide if the draft is now "Complete" or if it "Needs More Research".

Respond in JSON only:
{{
  "needs_more_research": false,
  "reasoning": "Why it is complete or what is still missing",
  "updated_draft_md": "# The revised markdown draft..."
}}"""
        resp = chat([{"role": "user", "content": prompt}], temperature=0.2)
        decision = safe_parse_json(resp, fallback={"needs_more_research": False, "updated_draft_md": self.working_draft})
        
        needs_more = decision.get("needs_more_research", False)
        updated_draft = decision.get("updated_draft_md", self.working_draft)
        
        self.log(f"Refinement complete. Needs more research: {needs_more}")
        return needs_more, updated_draft
