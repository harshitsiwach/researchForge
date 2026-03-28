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
    Footer,
    Header,
    Input,
    Label,
    Log,
    Static,
)
from textual.events import Key
from textual.worker import Worker, WorkerState

from apps.tui.api import ResearchForgeAPI

class PromptInput(Input):
    """An input field with command history navigating via up/down arrows."""
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.history = []
        self.history_index = -1

    def add_to_history(self, text: str):
        if text and (not self.history or self.history[-1] != text):
            self.history.append(text)
        self.history_index = len(self.history)

    async def on_key(self, event: Key):
        """Handle up/down arrow keys for history navigation."""
        if event.key == "up":
            # Prevent moving cursor to start of line in textual natively
            event.prevent_default()
            if self.history and self.history_index > 0:
                self.history_index -= 1
                self.value = self.history[self.history_index]
        elif event.key == "down":
            event.prevent_default()
            if self.history and self.history_index < len(self.history) - 1:
                self.history_index += 1
                self.value = self.history[self.history_index]
            else:
                self.history_index = len(self.history)
                self.value = ""

class ChatScreen(Screen):
    """The central conversational interface."""

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        yield Log(id="chat-log", markup=True, wrap=True)
        with Container(id="input-container"):
            yield PromptInput(placeholder="Type your research prompt or /help for commands...", id="prompt-input")
        yield Footer()

    async def on_mount(self) -> None:
        self.chat_log = self.query_one("#chat-log", Log)
        self.prompt_input = self.query_one("#prompt-input", PromptInput)
        self.prompt_input.focus()

        # Welcome message
        self.log_msg("system", "System initialized. Connected to local AI broker.")
        self.log_msg("system", "Type [bold]/help[/bold] to see available commands.")

    def log_msg(self, role: str, text: str):
        """Append a colored message to the log view."""
        if role == "user":
            self.chat_log.write_line(f"[bold #6366f1]❯ You:[/bold #6366f1] {text}")
        elif role == "agent":
            self.chat_log.write_line(f"[bold #34d399]🤖 Agent:[/bold #34d399] {text}")
        elif role == "system":
            self.chat_log.write_line(f"[italic #94a3b8]{text}[/italic #94a3b8]")
        elif role == "tool":
            self.chat_log.write_line(f"[bold #f59e0b]🔧 Tool:[/bold #f59e0b] {text}")
        elif role == "error":
            self.chat_log.write_line(f"[bold #ef4444]✖ Error:[/bold #ef4444] {text}")
        
        self.chat_log.scroll_end(animate=False)

    @on(Input.Submitted, "#prompt-input")
    def on_input_submitted(self, event: Input.Submitted) -> None:
        text = event.value.strip()
        if not text:
            return
            
        # Add to history
        self.prompt_input.add_to_history(text)
        
        # Clear input field
        self.prompt_input.value = ""
        
        # Display user input in log
        self.log_msg("user", text)

        # Handle commands vs prompts
        if text.startswith("/"):
            self.handle_slash_command(text)
        else:
            self.handle_prompt(text)

    def handle_slash_command(self, cmd_text: str):
        parts = cmd_text.split()
        cmd = parts[0].lower()

        if cmd == "/help":
            self.log_msg("system", "Available commands:\n  /help - Show this message\n  /clear - Clear the screen\n  /status - Check backend connection\n  /projects - List available workspaces and projects\n  /quit - Exit terminal")
        elif cmd == "/clear":
            self.chat_log.clear()
        elif cmd == "/quit":
            self.app.exit()
        elif cmd == "/status":
            self.log_msg("system", "Checking backend status...")
            self.execute_status()
        elif cmd == "/projects":
            self.log_msg("system", "Fetching laboratory projects...")
            self.execute_projects()
        else:
            self.log_msg("error", f"Unknown command: {cmd}")

    @work(exclusive=True)
    async def execute_status(self) -> None:
        api = self.app.api
        try:
            jobs = await api.get_active_jobs()
            runs = len(jobs.get("runs", []))
            ar_jobs = len(jobs.get("auto_research_jobs", []))
            self.log_msg("agent", f"System Status: [bold bright_green]ONLINE[/]\nActive Simulations: {runs}\nActive Auto-Researchers: {ar_jobs}")
            
            for index, run in enumerate(jobs.get("runs", [])):
                self.log_msg("agent", f"  • Sim [{run['id']}] ({run['mode']}) - {run['status']}")

        except Exception as e:
            self.log_msg("error", f"Backend offline or unreachable. ({e})")

    @work(exclusive=True)
    async def execute_projects(self) -> None:
        api = self.app.api
        try:
            workspaces = await api.get_workspaces()
            if not workspaces:
                self.log_msg("agent", "Database is empty. No workspaces found.")
                return
                
            out = ["Laboratory Directory:"]
            for ws in workspaces:
                out.append(f"📁 [bold]{ws['name']}[/bold]")
                ws_details = await api.get_workspace(ws["id"])
                for proj in ws_details.get("projects", []):
                    out.append(f"  └─ 📄 {proj['name']} ({proj.get('question', 'No question')})")
            
            self.log_msg("agent", "\n".join(out))
        except Exception as e:
            self.log_msg("error", f"Failed to fetch projects. ({e})")

    def handle_prompt(self, prompt: str):
        """Simulate sending prompt to research backend."""
        self.log_msg("system", f"Dispatching query: '{prompt}'")
        self.run_mock_research(prompt)

    @work(exclusive=True)
    async def run_mock_research(self, query: str):
        # In the future, this will POST to the API to run auto-research and stream the response
        await asyncio.sleep(0.5)
        self.log_msg("tool", "web_search(query=\"" + query + "\")")
        await asyncio.sleep(1.2)
        self.log_msg("tool", "Processing 4 results from web search...")
        await asyncio.sleep(1.0)
        self.log_msg("agent", "Research complete. The data suggests that this is a complex topic requiring multi-agent simulation to fully resolve. \n\nI have drafted an initial Seed background based on live facts. Would you like me to trigger a deeper debate? (Type Yes/No in future update)")
        

class ResearchForgeTUI(App):
    """The main ResearchForge Conversational Terminal."""

    CSS_PATH = "styles.tcss"
    BINDINGS = [
        Binding("ctrl+c", "quit", "Quit", show=False),
        Binding("ctrl+l", "clear", "Clear Screen", show=False),
    ]

    SCREENS = {
        "chat": ChatScreen,
    }

    def __init__(self):
        super().__init__()
        self.api = ResearchForgeAPI()

    def compose(self) -> ComposeResult:
        # We start on the chat screen immediately
        yield Container()

    async def on_mount(self) -> None:
        self.title = "RESEARCHFORGE // CONVERSATIONAL CLI"
        self.sub_title = "v0.2.0-chat-pivot"
        self.push_screen("chat")
        
    def action_clear(self) -> None:
        self.screen.chat_log.clear()

if __name__ == "__main__":
    app = ResearchForgeTUI()
    app.run()
