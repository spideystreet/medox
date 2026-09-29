---
paths:
  - src/medox/agent/**
  - src/medox/api/**
  - tests/agent/**
---

# Agent

The served agent is `src/medox/api/agent.py`: a Mistral tool loop, at most six rounds. The server key is `MISTRAL_API_KEY`, else `OPENROUTER_API_KEY`.

## Tools

| File | Function | Data |
|------|----------|------|
| `tool_search_drug.py` | `search_drug` | pgvector `idx_bdpm_medicament_v1` |
| `tool_find_generics.py` | `find_generics` | Silver generics |
| `tool_check_interactions.py` | `check_interactions` | Silver interactions and classes, then pgvector |
| `tool_get_rcp.py` | `get_rcp` | ANSM safety notices in `silver_bdpm__info_importante` (not the full RCP) |

SQL lives in `agent/queries.py`.

## Guardrail

`agent/safety.py` reads `[niveau] A + B` lines from tool output. `contre-indication` and `association déconseillée` are prefixed onto the answer. Jev is eval-only.

```bash
uv run dotenv -f .env run -- uv run uvicorn medox.api.app:app --host 0.0.0.0 --port 2024
```
