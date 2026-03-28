<p align="center">
  <img src="https://img.shields.io/badge/ResearchForge-v0.1-6366f1?style=for-the-badge&labelColor=0a0e1a" />
  <img src="https://img.shields.io/badge/Local--First-🔒-34d399?style=for-the-badge&labelColor=0a0e1a" />
  <img src="https://img.shields.io/badge/LLM%20Powered-🧠-818cf8?style=for-the-badge&labelColor=0a0e1a" />
</p>

<h1 align="center">🔬 ResearchForge</h1>

<p align="center">
  <strong>A local-first, self-improving research platform</strong><br/>
  Combine multi-agent simulation with controlled experiment loops — all running on your machine.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#%EF%B8%8F-architecture">Architecture</a> •
  <a href="#-connect-your-llm">Connect Your LLM</a> •
  <a href="#-usage-guide">Usage Guide</a> •
  <a href="#-tech-stack">Tech Stack</a>
</p>

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** — [python.org](https://python.org) or `brew install python`
- **Node.js 18+** — [nodejs.org](https://nodejs.org) or `brew install node`
- **A local LLM** — [Ollama](https://ollama.ai), [LM Studio](https://lmstudio.ai), or an OpenAI API key

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/harshitsiwach/researchForge.git
cd researchForge

# 2. Set up the backend
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Set up the frontend
cd ../../apps/web
npm install

# 4. Configure your LLM (copy and edit)
cd ../..
cp .env.example .env
```

### Start the Servers

You'll need **two terminals**:

```bash
# Terminal 1 — Backend API (port 8000)
cd apps/api
source .venv/bin/activate
PYTHONPATH="$(cd ../.. && pwd)" uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend UI (port 3000)
cd apps/web
npm run dev
```

Or use the helper scripts:

```bash
./scripts/setup.sh   # Install everything
./scripts/dev.sh     # Start both servers
```

Then open **[http://localhost:3000](http://localhost:3000)** 🎉

---

## ✨ Features

### 🔭 Multi-Agent Scenario Simulation
Upload seed materials (papers, notes, docs) and run multi-agent simulations that explore your research question from diverse perspectives. Agents debate, challenge, and synthesize scenario branches.

### 🔄 Self-Improving Research Loop
Inspired by [autoresearch](https://github.com/fblissjr/autoresearch): run a baseline config → mutate to a challenger → evaluate both → keep the winner. Your research gets better with every iteration.

### 📊 6-Dimension Evaluation
Every report is scored on: **Usefulness**, **Consistency**, **Grounding**, **Diversity**, **Clarity**, and **Novelty**. Animated score bars, composite grades, and side-by-side comparison.

### ⚖️ Baseline vs. Challenger Compare
Side-by-side evaluation with per-dimension score deltas. Promote winning configs to become your new baseline.

### 🦙 Any Local LLM
One-click presets for **Ollama**, **LM Studio**, and **OpenAI**. Test your connection, discover available models, and pick one — all from the Settings UI. No cloud required.

### 🌙 Premium Dark UI
Glassmorphism cards, gradient accents, micro-animations, and a sleek sidebar. Designed to feel premium and professional.

---

## 🏗️ Architecture

```
researchforge/
├── apps/
│   ├── api/                 # FastAPI backend (Python)
│   │   ├── main.py          # App entry point
│   │   ├── db.py            # SQLite database layer
│   │   └── routers/         # API route handlers
│   │       ├── workspaces.py
│   │       ├── seeds.py
│   │       ├── runs.py
│   │       ├── reports.py
│   │       ├── compare.py
│   │       └── app_settings.py
│   ├── tui/                 # Conversational CLI (Textual)
│   │   ├── main.py          # Chat interface entry point
│   │   ├── api.py           # Async backend client
│   │   └── styles.tcss      # Cyber-Lab terminal theme
│   └── web/                 # Vite + React frontend
│       └── src/
│           ├── App.jsx      # Root component + routing
│           ├── api.js       # API client
│           ├── index.css    # Design system
│           └── pages/       # All page components
├── packages/
│   ├── core/                # Shared schemas, config, LLM client
│   │   ├── schemas.py       # Pydantic models
│   │   ├── config.py        # .env loader
│   │   └── llm.py           # OpenAI-compatible chat + test
│   ├── simulation/          # MiroFish-inspired scenario engine
│   │   └── adapter.py       # 4-step pipeline: extract → personas → scenarios → report
│   ├── research_loop/       # autoresearch-inspired experiment loop
│   │   └── runner.py        # Config mutation via LLM
│   └── evaluation/          # Multi-dimension rubric scorer
│       └── scorer.py        # 6-dimension scoring + comparison
├── workspaces/              # Local data (SQLite, artifacts)
├── docs/
│   └── integration_notes.md # How MiroFish & autoresearch were adapted
├── scripts/
│   ├── setup.sh             # One-command install
│   └── dev.sh               # Start both servers
├── .env.example             # Environment template
├── .gitignore
└── README.md
```

---

## 🦙 Connect Your LLM

ResearchForge works with **any OpenAI-compatible API**. Configure from the Settings page or `.env` file.

### Option 1: Ollama (Recommended for Local)

```bash
# Install
brew install ollama

# Pull a model
ollama pull llama3.2

# Start the server
ollama serve
```

Then in ResearchForge Settings:
- **URL**: `http://localhost:11434/v1`
- **Model**: `llama3.2`
- **API Key**: `ollama`

### Option 2: LM Studio

1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Load a model and start the local server
3. In Settings → **URL**: `http://localhost:1234/v1`

### Option 3: OpenAI API

- **URL**: `https://api.openai.com/v1`
- **Model**: `gpt-4o-mini` (cheapest) or `gpt-4o`
- **API Key**: Your OpenAI API key

### Option 4: Any OpenAI-Compatible Server

Works with vLLM, text-generation-inference, LocalAI, Jan, etc. — any server that exposes `/v1/chat/completions`.

> **Tip:** Click **"Test Connection"** in Settings to verify your LLM is reachable, then **"Load Models"** to discover available models.

---

## 📖 Usage Guide

### 1. Create a Workspace & Project

- Open [localhost:3000](http://localhost:3000)
- Click **"+ New Workspace"** → name it
- Click **"+ New Project"** → add a name and research question

### 2. Upload Seed Materials

From the project page, click **"+ Upload Seed"** to add your research materials:
- Markdown files, text documents, CSV data
- Research papers, meeting notes, strategy documents

### 3. Launch a Simulation Run

Click **"🚀 Launch Run"** and configure:

| Mode | Purpose |
|------|---------|
| 🔭 **Explore** | Open-ended research, generate hypotheses |
| 🎯 **Decision** | Stress-test a plan or idea |
| ⚖️ **Compare** | Compare alternatives (products, strategies) |
| 🔄 **Improve** | Auto-improve research config |

Tune the simulation: number of agents (4–16), rounds (4–20), debate style, and critique strength.

### 4. Monitor & View Results

- **Run Monitor** — live logs as the simulation runs
- **Results** — scores, scenario cards, full report with export options

### 5. Compare & Improve

Run two simulations with different configs, then use **Compare** to see which produced better research. Promote the winner as your new baseline.

---

## 🖥️ Terminal Interface (RFT)

ResearchForge includes a professional-grade **Conversational CLI** that mimics the experience of Claude Code and Gemini CLI, allowing you to manage your laboratory directly from your dev console.

### Key Features
- **Chat-Driven Research**: Talk to the ResearchForge agents natively.
- **Slash Commands (`/`)**: Fast navigation via `/projects`, `/status`, `/help`, and more.
- **Arrow Key History**: Full support for Up/Down arrow keys to navigate command history.
- **Cyber-Lab Aesthetic**: Premium, neon-accented terminal visuals powered by Textual CSS.

### How to Launch

The TUI depends on `textual` and `httpx`. We recommend using `uv` or a virtual environment for the best experience:

```bash
# 1. Install RFT dependencies
uv pip install textual httpx

# 2. Launch the Laboratory Terminal
PYTHONPATH=. python3 apps/tui/main.py
```

---

## 🔌 API Reference

The backend exposes a full REST API at `http://localhost:8000`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/workspaces` | GET/POST | List or create workspaces |
| `/api/workspaces/{id}` | GET | Get workspace with projects |
| `/api/workspaces/{id}/projects` | GET/POST | List or create projects |
| `/api/projects/{id}/seeds` | GET/POST | List or upload seeds |
| `/api/projects/{id}/runs` | GET/POST | List or create runs |
| `/api/runs/{id}` | GET | Get run status + logs |
| `/api/runs/{id}/report` | GET | Get report with scores |
| `/api/runs/{id}/report/export` | GET | Export as md/json/html |
| `/api/projects/{id}/compare` | POST | Compare two runs |
| `/api/projects/{id}/promote/{runId}` | POST | Promote config |
| `/api/settings` | GET/PUT | Get or update LLM settings |
| `/api/settings/test-connection` | POST | Test LLM connectivity |
| `/api/settings/models` | GET | List available models |

Interactive API docs at **[localhost:8000/docs](http://localhost:8000/docs)** (Swagger UI).

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11+, FastAPI, SQLite, uvicorn |
| **Frontend** | React 18, Vite, vanilla CSS |
| **LLM** | Any OpenAI-compatible API |
| **Database** | SQLite (local, zero-config) |
| **Packages** | Pydantic, openai, python-dotenv |

---

## 📁 Environment Variables

Copy `.env.example` to `.env`:

```env
# LLM endpoint
LLM_BASE_URL=http://localhost:11434/v1   # Ollama default
LLM_MODEL=llama3.2
LLM_API_KEY=ollama

# Server
API_HOST=0.0.0.0
API_PORT=8000

# Database
DATABASE_URL=sqlite:///./workspaces/researchforge.db

# Defaults
MAX_AGENTS=8
MAX_ROUNDS=10
```

> **Note:** Settings saved from the UI override `.env` values at runtime.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Push and open a PR

---

## 📄 License

MIT

---

<p align="center">
  <strong>Built with 🔬 by the ResearchForge team</strong><br/>
  <em>Local-first research, powered by your own LLM</em>
</p>
