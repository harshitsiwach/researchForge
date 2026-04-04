# AGENTS.md — ResearchForge

## Project Overview
ResearchForge is a local-first, self-improving research platform. Multi-agent simulations explore research questions from diverse perspectives, score reports, and iteratively improve configurations.

**Architecture:** Monorepo with 3 apps + shared packages.
- `apps/api/` — FastAPI backend (Python 3.11+)
- `apps/web/` — React 18 + Vite 6 frontend (plain JS, no TypeScript)
- `apps/tui/` — Textual terminal UI (Python)
- `packages/` — Shared modules: `core`, `database`, `evaluation`, `research_loop`, `simulation`, `tools`

## Commands

### Setup (one-time)
```bash
./scripts/setup.sh          # Creates venv, installs Python + Node deps, copies .env
```

### Development
```bash
./scripts/dev.sh            # Starts API (:8000) + frontend (:3000) concurrently
```

### Backend (Python)
```bash
cd apps/api
source .venv/bin/activate
PYTHONPATH=<project-root> uvicorn main:app --reload --port 8000
```

### Frontend (Node)
```bash
cd apps/web
npm run dev                 # Vite dev server on :3000
npm run build               # Production build
npm run preview             # Preview production build
```

### Testing
**No test framework exists.** To add tests:
- Python: use `pytest` — place `tests/` at project root, run `pytest`
- Frontend: use `vitest` (matches Vite setup) — place `*.test.js` alongside source

## Code Style

### Python (Backend + Packages)
- **Imports:** Standard library → third-party → local `packages.*`. Separate groups with blank lines.
- **Module docstrings:** Every `.py` file starts with a triple-quoted docstring.
- **Naming:** `snake_case` for functions/variables, `PascalCase` for classes.
- **Type hints:** Use on function signatures. Common: `Optional`, `list[dict]`, `tuple`, `Callable`.
- **Forward references:** Use `from __future__ import annotations` at top of modules.
- **Pydantic models:** `PascalCase` class names, typed fields with `Field()` defaults.
- **IDs:** Prefixed hex UUIDs via `new_id("prefix")` — e.g. `ws_`, `run_`, `proj_`, `cfg_`, `rpt_`.
- **Database:** Raw `sqlite3`, no ORM. Always `conn.commit()` then `conn.close()`. Use `?` placeholders.
- **Error handling:** `try/except Exception` — catch, log, return error string or set status to `"failed"`.
- **Background work:** `threading.Thread` (daemon=True), not async task queues.
- **No linter/formatter configured.** Follow existing code patterns.

### JavaScript/React (Frontend)
- **No TypeScript.** Plain `.jsx` and `.js` files.
- **Components:** Functional components with hooks (`useState`, `useEffect`). Named default exports.
- **State management:** Zustand for shared state. `create()` stores in dedicated `store/` files.
- **API client:** Flat `api.js` module with named exports — one function per endpoint.
- **Routing:** React Router 6 with `Routes`/`Route` in `App.jsx`.
- **CSS:** Vanilla CSS with custom properties (design tokens) in `index.css`. BEM-like class names.
- **Error handling:** Use the `Toast` component for user-facing errors. `try/catch` with `toast.error(e.message)`.
- **No linter/formatter configured.** Follow existing code patterns.

## Architecture Patterns

### Import Resolution
Python packages are imported via `sys.path` manipulation in `main.py`:
```python
_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_root))
```
All shared code uses `packages.*` namespace (e.g. `from packages.core.schemas import SimConfig`).

### Database
- SQLite with WAL mode, foreign keys enabled.
- Schema via `CREATE TABLE IF NOT EXISTS` in `init_db()` — no migrations framework.
- JSON stored as text columns, parsed with `json.loads()` / `json.dumps()`.

### LLM Integration
- Any OpenAI-compatible API (Ollama, LM Studio, OpenAI).
- `safe_parse_json()` provides 4-attempt fallback: direct parse → extract block → repair+parse → extract from repaired.
- Custom `json_repair.py` handles malformed LLM output (trailing commas, markdown fences, etc.).

### API Routes
RESTful with plural nouns. All under `/api/` prefix. SSE for live event streaming.

### Environment
Settings override chain: DB settings (saved via UI) > `.env` defaults. Configure `LLM_BASE_URL`, `LLM_MODEL`, `API_HOST`, `API_PORT`, `DATABASE_URL`.

## Product Context (from instructions.md)

### Core Principles
- **Local-first.** Everything runs on the user's machine.
- **Human-supervised self-improvement.** No autonomous changes without review.
- **Simulation is not truth.** All outputs must be labeled as scenarios, not predictions.
- **Small, testable changes beat giant rewrites.**
- **Every important result must be inspectable.**

### Build Order (follow strictly)
1. **Phase 1:** Merge understanding — inspect repos, document interfaces, propose plan
2. **Phase 2:** Minimal platform — API, frontend shell, workspace/project creation, seed upload
3. **Phase 3:** First useful run — simulation engine, seed ingestion, scenario generation, report in UI
4. **Phase 4:** Controlled improvement loop — baseline/challenger experiments, scoring, compare view
5. **Phase 5:** Product polish — UX, exports, presets, traceability

### What NOT to Build First
- Giant autonomous company simulation
- Multi-thousand-agent infrastructure
- Heavy billing/multi-tenant SaaS
- Mobile app, marketplace, social layer
- Full desktop packaging before web app works well

### UI Goals
- Dark mode default, card-based layout, clear run history
- Side-by-side baseline vs challenger comparison
- Smooth progress states, minimal clutter
- Empty states that teach the user what to do next
- No developer-only junk exposed in core screens

## Key Files
| Path | Purpose |
|---|---|
| `apps/api/main.py` | FastAPI entry point, router registration |
| `apps/api/routers/` | API route handlers |
| `packages/core/schemas.py` | Pydantic models + `new_id()` |
| `packages/core/llm.py` | LLM client + `safe_parse_json()` |
| `packages/database/core.py` | SQLite connection + schema |
| `packages/evaluation/scorer.py` | 6-dimension rubric scorer |
| `packages/simulation/` | Multi-agent scenario engine |
| `apps/web/src/api.js` | Frontend API client |
| `apps/web/src/App.jsx` | React router + layout |
