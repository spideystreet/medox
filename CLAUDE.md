# Medox

Medical drug interaction assistant for French healthcare professionals.
FastAPI tool loop over BDPM and ANSM data. The server holds the model key.

## Tech Stack

**Backend**: Python · FastAPI · Mistral SDK · Dagster · dbt · PostgreSQL · pgvector
**Frontend**: React 18 · TypeScript · Vite · TanStack Router · TanStack Query · Tailwind CSS

## Architecture

```
Bronze (raw files) → Silver (PostgreSQL via dbt) → Gold (pgvector)
                                                      ↓
                         FastAPI + Mistral tool loop
                                                      ↓
                         React frontend (Vite, port 5177)
```

Chat uses `OPENROUTER_API_KEY`. Visitors do not enter a key.

BDPM download files are refreshed monthly. The ANSM interaction thesaurus is frozen (15 September 2023, online until 15 June 2027).

A critical ANSM level (`contre-indication`, `association déconseillée`) is prefixed onto the answer in `src/medox/agent/safety.py`. Jev judges eval answers only. It is not on the request path.

## Key directories

| Path | Role |
|------|------|
| `src/medox/api/` | FastAPI app, Mistral loop, SQLite threads |
| `src/medox/agent/` | Tools, SQL queries, safety prefix |
| `src/medox/retrieval/` | pgvector search, cosine cutoff, E5 prefixes |
| `src/medox/eval/` | Jev judge |
| `src/medox/pipeline/` | Dagster bronze, raw load, gold embeddings |
| `dbt/` | Silver models and contracts |
| `frontend/` | React app. Playwright tests in `frontend/e2e/` |
| `tests/` | pytest. Live Jev cases are marked `eval` |
| `deploy/` | Hetzner VPS (Docker, Caddy). Domain `medoxai.com` |
| `.github/workflows/` | CI, Jev eval job, deploy on release |

## Run

```bash
uv run dotenv -f .env run -- uv run uvicorn medox.api.app:app --host 0.0.0.0 --port 2024
cd frontend && npm run dev
```

Frontend at `localhost:5177`. API at `localhost:2024`.

Refresh data with Dagster, in order: bronze, then silver (dbt), then gold. There is no cron.

## Memory

When you learn something important about this project — gotchas, debugging fixes, architecture decisions, env quirks — save it to your project memory so future conversations start with that context. Do this proactively as you work, not just when asked.
