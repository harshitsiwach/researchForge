# Integration Notes

## Source Repos

### MiroFish
- **Stack**: Flask backend, Vue 3 + Vite frontend, OASIS multi-agent sim, Zep Cloud graph memory
- **Reused concepts**: simulation pipeline (seed → entities → agents → scenarios → report), async task tracking, simulation state machine
- **Not portable**: Zep Cloud dependency, OASIS social media platform, Flask blueprints, Chinese-language codebase
- **Strategy**: Re-implemented conceptually in `packages/simulation/adapter.py` using pure LLM calls

### autoresearch
- **Stack**: Python, PyTorch, single-GPU training loop, `program.md` agent instructions
- **Reused concepts**: baseline/challenger experiment loop, keep/discard pattern, TSV experiment logging, configurable agent instructions
- **Not portable**: GPU/PyTorch training, `train.py` model code, `prepare.py` data pipeline
- **Strategy**: Re-implemented as `packages/research_loop/runner.py` — LLM-based config mutation instead of code mutation

## Adapter Interfaces

| Component | Source Inspiration | ResearchForge Implementation |
|---|---|---|
| SimulationAdapter | MiroFish `SimulationManager` | `packages/simulation/adapter.py` — 4-step LLM pipeline |
| ResearchLoopRunner | autoresearch `program.md` loop | `packages/research_loop/runner.py` — config mutation engine |
| Evaluator | Both (MiroFish report quality, autoresearch val_bpb) | `packages/evaluation/scorer.py` — 6-dimension rubric |

## What Was NOT Changed

Both original repos remain completely untouched. ResearchForge is a standalone new project.

## Key Design Decisions

1. **No external services** — no Zep, no OASIS, no managed APIs required
2. **SQLite for persistence** — simplest local-first data store
3. **Background threads for runs** — not celery/redis, keeping setup minimal
4. **LLM-as-simulation** — agent debate and scenario generation done via structured prompts, not full agent frameworks
5. **Config-as-experiment** — simulation configs are the unit of mutation (not source code like autoresearch)
