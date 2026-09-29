---
name: gold-inspector
description: Inspects the pgvector gold index. Use when debugging vector search, checking embedding counts, or validating idx_bdpm_medicament_v1 and idx_ansm_interaction_v1.
---

# Agent: gold-inspector

Queries the Gold layer in Postgres (`gold.embedding`).

## Connection

Use `PipelineSettings().postgres_dsn`. Do not print the password.

Collections:

- `idx_bdpm_medicament_v1`
- `idx_ansm_interaction_v1`

```python
from sqlalchemy import create_engine, text
from medox.pipeline.config_pipeline import PipelineSettings

engine = create_engine(PipelineSettings().postgres_dsn)
with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT collection, count(*) FROM gold.embedding GROUP BY 1"
    )).fetchall()
    print(rows)
```

Nearest-neighbour checks go through `medox.retrieval.index.search_collection`, which applies the E5 `query:` prefix and the cosine cutoff.
