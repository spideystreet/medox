# Testing

Unit tests run without Docker, a model, or Jev. Live checks are opt-in.

| Layer | Command | When |
| --- | --- | --- |
| Python unit | `uv run pytest -m "not integration and not eval"` | Every change. Retrieval ranking, thread store, API contract, guardrails. |
| SQL | `sqlfluff lint dbt/models/` and the dbt singular tests | Silver model changes. |
| Frontend types | `cd frontend && npx tsc -b` | UI changes. |
| Browser | `cd frontend && npm run test:e2e` | Flows: landing, key, chat, settings. The API is mocked. |
| Integration | `uv run pytest -m integration` | Needs Postgres and Chroma. |
| Jev | `MEDOX_EVAL=1 TYPESAFE_API_KEY=... uv run pytest -m eval` | Prompt or safety-rule changes. Mistral is not required for the calibration cases. A judge that always says yes fails them. |

Jev is the TypeSafe `jev-latest` model (`JEV_MODEL` overrides it). A check is a yes/no question. The API returns a probability (`noul`). `0.5` and above means yes. A check prefixed with `NOT:` inverts that, which is how a stuck judge is caught.

The vector indexes are Chroma collections `idx_bdpm_medicament_v1` and `idx_ansm_interaction_v1`. New builds use cosine HNSW and E5 `query:` / `passage:` prefixes. Queries on an older index skip the cosine cutoff so the wrong metric cannot empty the result list. Drug lookup is hybrid: SQL first for ANSM interactions, vector search as a fallback, then a token overlap check.
