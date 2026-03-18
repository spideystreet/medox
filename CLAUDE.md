# Medox

Medical drug interaction assistant for French Healthcare professionals. 
LangGraph ReAct agent over BDPM + ANSM data.

## Tech Stack

**Backend**: Python · LangGraph · LangChain · Dagster · dbt · PostgreSQL · ChromaDB (self-hosted)
**Frontend**: React 18 · TypeScript · Vite · Tailwind CSS · TanStack Query

## Architecture

```
Bronze (raw files) → Silver (PostgreSQL via dbt) → Gold (ChromaDB embeddings)
                                                          ↓
                                              LangGraph ReAct Agent
                                                          ↓
                                              React Frontend (Vite)
```

## Key directories

| Path | Role |
|------|------|
| `src/medox/agent/` | LangGraph agent, nodes, tools |
| `src/medox/pipeline/` | Dagster assets, loaders, parsers |
| `dbt/` | dbt Silver models + contracts |
| `frontend/` | React app (Vite + Tailwind + Playwright E2E) |
| `frontend/src/api/` | LangGraph API client + TanStack Query hooks |
| `frontend/src/components/` | React UI components |
| `frontend/e2e/` | Playwright E2E tests |
| `tests/` | pytest unit + e2e eval (`prompts.yaml`) |
| `scripts/` | `run_eval.py` — LangSmith evaluation |
