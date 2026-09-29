"""Gold embeddings in Postgres (pgvector).

Two indexes share one table: `idx_bdpm_medicament_v1` and
`idx_ansm_interaction_v1`. Distance is cosine (`<=>`), matching the E5 model.
"""

import json
import threading
from typing import Any

from sqlalchemy import Engine, create_engine, text

from medox.pipeline.config_pipeline import PipelineSettings
from medox.pipeline.io.embedder_local import embed_texts
from medox.retrieval.hits import Hit, filter_hits, prepare_query

MEDICAMENT_INDEX = "idx_bdpm_medicament_v1"
INTERACTION_INDEX = "idx_ansm_interaction_v1"
EMBEDDING_DIM = 768
HNSW_EF_SEARCH = 128

_META_KEYS = frozenset(
    {"cis", "etat_commercialisation", "substance_a", "substance_b", "niveau_contrainte"}
)

_engine: Engine | None = None
_engine_lock = threading.Lock()


def vector_literal(values: list[float]) -> str:
    """Format a finite vector for a `vector` cast."""
    parts: list[str] = []
    for value in values:
        number = float(value)
        if number != number or number in (float("inf"), float("-inf")):
            raise ValueError("Embedding contains a non-finite value")
        parts.append(f"{number:.8f}")
    return "[" + ",".join(parts) + "]"


def metadata_filter(where: dict[str, Any] | None) -> tuple[str, dict[str, str]]:
    """Equality filters on known metadata keys. Values stay bound parameters."""
    if not where:
        return "", {}
    clauses: list[str] = []
    params: dict[str, str] = {}
    for index, (key, value) in enumerate(where.items()):
        if key not in _META_KEYS:
            raise ValueError(f"Unknown metadata key: {key}")
        param = f"meta_{index}"
        clauses.append(f"metadata->>'{key}' = :{param}")
        params[param] = str(value)
    return " AND " + " AND ".join(clauses), params


def ensure_schema(engine: Engine) -> None:
    """Create the pgvector extension, gold schema, table, and HNSW index."""
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS gold"))
        conn.execute(
            text(
                f"""
                CREATE TABLE IF NOT EXISTS gold.embedding (
                    collection TEXT NOT NULL,
                    doc_id TEXT NOT NULL,
                    document TEXT NOT NULL,
                    metadata JSONB NOT NULL,
                    embedding vector({EMBEDDING_DIM}) NOT NULL,
                    PRIMARY KEY (collection, doc_id)
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS embedding_cosine_hnsw
                ON gold.embedding
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 200)
                """
            )
        )


def replace_collection(
    engine: Engine,
    collection: str,
    ids: list[str],
    documents: list[str],
    metadatas: list[dict[str, Any]],
    embeddings: list[list[float]],
) -> int:
    """Replace one index in a single transaction."""
    if not (len(ids) == len(documents) == len(metadatas) == len(embeddings)):
        raise ValueError("Gold rows are misaligned")
    ensure_schema(engine)
    payload = [
        {
            "collection": collection,
            "doc_id": doc_id,
            "document": document,
            "metadata": json.dumps(metadata),
            "embedding": vector_literal(embedding),
        }
        for doc_id, document, metadata, embedding in zip(
            ids, documents, metadatas, embeddings, strict=True
        )
    ]
    insert = text(
        """
        INSERT INTO gold.embedding (collection, doc_id, document, metadata, embedding)
        VALUES (
            :collection,
            :doc_id,
            :document,
            CAST(:metadata AS jsonb),
            CAST(:embedding AS vector)
        )
        """
    )
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM gold.embedding WHERE collection = :collection"),
            {"collection": collection},
        )
        for start in range(0, len(payload), 200):
            conn.execute(insert, payload[start : start + 200])
    return len(payload)


def search_collection(
    collection: str,
    query: str,
    *,
    n_results: int,
    where: dict[str, Any] | None = None,
) -> list[Hit]:
    """Embed the query, take the nearest rows, then apply the cosine cutoff."""
    settings = PipelineSettings()
    vector = embed_texts(settings.embedding_model, [prepare_query(query, "e5")])[0]
    extra_sql, extra_params = metadata_filter(where)
    statement = text(
        f"""
        SELECT doc_id, document, metadata,
               embedding <=> CAST(:embedding AS vector) AS distance
        FROM gold.embedding
        WHERE collection = :collection
        {extra_sql}
        ORDER BY embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
        """
    )
    params: dict[str, Any] = {
        "embedding": vector_literal(vector),
        "collection": collection,
        "limit": n_results,
        **extra_params,
    }
    with _get_engine().begin() as conn:
        conn.execute(text(f"SET LOCAL hnsw.ef_search = {HNSW_EF_SEARCH}"))
        rows = conn.execute(statement, params).fetchall()

    hits: list[Hit] = []
    for row in rows:
        metadata = row.metadata
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        hits.append(
            Hit(
                document=str(row.document),
                metadata=dict(metadata),
                distance=float(row.distance),
                hit_id=str(row.doc_id),
            )
        )
    return filter_hits(hits, space="cosine", limit=n_results)


def _get_engine() -> Engine:
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                _engine = create_engine(PipelineSettings().postgres_dsn)
    return _engine
