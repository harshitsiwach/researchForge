from __future__ import annotations

import asyncio
from typing import ClassVar, Iterable

from textual import on, work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import (
    Button,
    DataTable,
    Footer,
    Header,
    Label,
    Log,
    ProgressBar,
    Static,
    Tree,
)
from textual.worker import Worker, WorkerState

from apps.tui.api import ResearchForgeAPI

class KPIContainer(Static):
    """A widget to display Key Performance Indicators."""
    def __init__(self, label: str, value: str, classes: str = ""):
        super().__init__("", classes=f"kpi-card {classes}")
        self._label = label
        self._value = value

    def compose(self) -> ComposeResult:
        yield Label(self._label, classes="kpi-label")
        yield Label(self._value, classes="kpi-value")

class LogoHeader(Static):
    """The ResearchForge branding header with ASCII art."""
    def compose(self) -> ComposeResult:
        yield Label(r"""
  _____                               _      ______                     
 |  __ \                             | |    |  ____|                    
 | |__) |___  ___  ___  __ _ _ __ ___| |__  | |__ ___  _ __ __ _  ___ 
 |  _  // _ \/ __|/ _ \/ _` | '__/ __| '_ \ |  __/ _ \| '__/ _` |/ _ \
 | | \ \  __/\__ \  __/ (_| | | | (__| | | || | | (_) | | | (_| |  __/
 |_|  \_\___||___/\___|\__,_|_|  \___|_| |_||_|  \___/|_|  \__, |\___|
                                                            __/ |     
                                                           |___/      
""", id="logo-ascii")
        yield Label("TERMINAL_INTELLIGENCE_SYSTEM // V0.1.0-ALPHA", id="tagline")

class DashboardScreen(Screen):
    """The main view showing system health and active work."""

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        yield LogoHeader()
        with Container(id="dashboard"):
            with Horizontal(id="kpi-row"):
                self.ws_kpi = KPIContainer("Workspaces", "...", classes="ws-kpi")
                self.jobs_kpi = KPIContainer("Active Jobs", "...", classes="jobs-kpi")
                self.reports_kpi = KPIContainer("Reports", "...", classes="reports-kpi")
                yield self.ws_kpi
                yield self.jobs_kpi
                yield self.reports_kpi
            
            with Vertical(id="activity-section"):
                yield Label("ACTIVE RUNS", classes="section-title")
                yield DataTable(id="active-runs-table")
        yield Footer()

    async def on_mount(self) -> None:
        table = self.query_one("#active-runs-table", DataTable)
        table.add_columns("Run ID", "Project ID", "Mode", "Started At", "Action")
        table.cursor_type = "row"
        self.update_stats()

    @on(DataTable.RowSelected)
    def on_row_selected(self, event: DataTable.RowSelected) -> None:
        run_id = event.row_key.value
        if run_id:
            self.app.push_screen(SimulationMonitorScreen(run_id=run_id))

    @work(exclusive=True)
    async def update_stats(self) -> None:
        """Fetch and update dashboard stats from the API."""
        api = self.app.api
        try:
            workspaces = await api.get_workspaces()
            jobs = await api.get_active_jobs()
            
            # Update KPI Values
            self.ws_kpi.query_one(".kpi-value").update(str(len(workspaces)))
            self.jobs_kpi.query_one(".kpi-value").update(str(jobs.get("total_active", 0)))
            self.reports_kpi.query_one(".kpi-value").update(str(jobs.get("total_reports", 0)))
            
            # Update Active Runs Table
            table = self.query_one("#active-runs-table", DataTable)
            table.clear()
            for run in jobs.get("runs", []):
                table.add_row(
                    run["id"], 
                    run["project_id"], 
                    run["mode"], 
                    run["started_at"][:19], 
                    "[ENTER] Monitor",
                    key=run["id"]
                )
        except Exception as e:
            self.app.notify(f"Connection failed: {e}", severity="error")

class SimulationMonitorScreen(Screen):
    """Real-time monitoring of a specific research simulation."""
    def __init__(self, run_id: str):
        super().__init__()
        self.run_id = run_id

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        with Container(classes="monitor-container"):
            yield Label(f"MONITORING RUN: {self.run_id}", id="monitor-title")
            self.progress = ProgressBar(total=100, show_percentage=True, id="monitor-progress")
            yield self.progress
            with Horizontal(id="monitor-body"):
                self.log_panel = Log(classes="log-panel", id="simulation-log")
                yield self.log_panel
                with Vertical(id="monitor-sidebar"):
                    yield Label("SCENARIOS", classes="sidebar-title")
                    self.scenarios_list = Static("Waiting for scenarios...", id="scenarios-preview")
                    yield self.scenarios_list
        yield Footer()

    BINDINGS = [
        Binding("escape", "app.pop_screen", "Back to Dashboard"),
    ]

    async def on_mount(self) -> None:
        self.start_monitoring()

    @work(exclusive=True)
    async def start_monitoring(self) -> None:
        """Subscribe to SSE events and append logs."""
        api = self.app.api
        async for event in api.stream_run_events(self.run_id):
            if event.get("type") == "error":
                self.log_panel.write_line(f"[ERR] {event.get('message')}")
            else:
                timestamp = event.get("timestamp", 0)
                msg = event.get("message", event.get("type", "Event"))
                data = event.get("data", "")
                
                # Colorize based on event type
                if event.get("type") == "agent_debate_started":
                    self.log_panel.write_line(f"[bold cyan]{msg}[/bold cyan] {data}")
                elif event.get("type") == "tool_called":
                    self.log_panel.write_line(f"[yellow]🔧 {msg}[/yellow] {data}")
                else:
                    self.log_panel.write_line(f"[{msg}] {data}")

                if "round" in event:
                    self.progress.advance(10)
                
                # Update scenarios list if found
                if event.get("type") == "agent_debate_finished":
                    scenarios_count = event.get("scenariosCount", 0)
                    self.scenarios_list.update(f"✨ Found {scenarios_count} scenarios.\n\nVisit the Web UI or\nExport MD to view details.")

class ProjectExplorerScreen(Screen):
    """Browse workspaces and projects in a tree view."""
    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        yield LogoHeader()
        with Horizontal():
            yield Tree("LABORATORY WORKSPACES", id="project-tree", classes="sidebar")
            with Vertical(id="project-details"):
                yield Label("SELECT A PROJECT", id="details-title")
                yield Static(id="project-info")
        yield Footer()

    async def on_mount(self) -> None:
        tree = self.query_one("#project-tree", Tree)
        tree.root.expand()
        self.load_projects()

    @work(exclusive=True)
    async def load_projects(self) -> None:
        api = self.app.api
        workspaces = await api.get_workspaces()
        tree = self.query_one("#project-tree", Tree)
        tree.clear()
        
        for ws in workspaces:
            ws_node = tree.root.add(f"📁 {ws['name']}", data=ws)
            # Fetch workspace details for projects
            ws_details = await api.get_workspace(ws["id"])
            for proj in ws_details.get("projects", []):
                ws_node.add_leaf(f"📄 {proj['name']}", data=proj)

class ResearchForgeTUI(App):

    """The main ResearchForge Terminal application."""

    CSS_PATH = "styles.tcss"
    BINDINGS = [
        Binding("q", "quit", "Quit", show=True),
        Binding("d", "switch_screen('dashboard')", "Dashboard", show=True),
        Binding("p", "switch_screen('projects')", "Projects", show=True),
        Binding("r", "refresh", "Refresh Data", show=True),
    ]

    SCREENS = {
        "dashboard": DashboardScreen,
        "projects": ProjectExplorerScreen,
    }

    def __init__(self):
        super().__init__()
        self.api = ResearchForgeAPI()

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(id="root")
        yield Footer()

    async def on_mount(self) -> None:
        self.title = "RESEARCHFORGE // LABORATORY TERMINAL"
        self.sub_title = "v0.1.0-alpha"
        self.push_screen("dashboard")

    def action_refresh(self) -> None:
        """Refresh the active screen's data."""
        pass

if __name__ == "__main__":
    app = ResearchForgeTUI()
    app.run()
