"""
Gold layer — vector embeddings stored in Postgres with pgvector.
Index naming: idx_<source>_<content>_<model_version>
"""

from collections.abc import Callable
from typing import Any

from dagster import AssetExecutionContext, AssetKey, asset
from sqlalchemy import create_engine

from medox.pipeline.config_pipeline import PipelineSettings
from medox.pipeline.io.builder_documents import (
    build_interaction_documents,
    build_medicament_documents,
)
from medox.pipeline.io.embedder_local import embed_texts
from medox.retrieval.index import INTERACTION_INDEX, MEDICAMENT_INDEX, replace_collection

BATCH_SIZE = 100


@asset(
    group_name="gold",
    deps=[
        AssetKey(["silver", "silver_bdpm__medicament"]),
        AssetKey(["silver", "silver_bdpm__composition"]),
        AssetKey(["silver", "silver_ansm__interaction"]),
    ],
)
def gold_embeddings(context: AssetExecutionContext) -> None:
    """Embed Silver tables into gold.embedding."""
    settings = PipelineSettings()
    engine = create_engine(settings.postgres_dsn)

    med_count = _load(
        engine,
        settings.embedding_model,
        MEDICAMENT_INDEX,
        lambda: build_medicament_documents(engine),
        context,
    )
    int_count = _load(
        engine,
        settings.embedding_model,
        INTERACTION_INDEX,
        lambda: build_interaction_documents(engine),
        context,
    )
    context.add_output_metadata(
        {
            MEDICAMENT_INDEX: med_count,
            INTERACTION_INDEX: int_count,
        }
    )


def _load(
    engine: Any,
    model_name: str,
    collection: str,
    builder: Callable[[], tuple[list[str], list[str], list[dict[str, Any]]]],
    context: AssetExecutionContext,
) -> int:
    ids, documents, metadatas = builder()
    embeddings: list[list[float]] = []
    total = len(documents)
    for start in range(0, total, BATCH_SIZE):
        embeddings.extend(embed_texts(model_name, documents[start : start + BATCH_SIZE]))
        context.log.info(f"[gold] {collection} — embedded {min(start + BATCH_SIZE, total)}/{total}")
    count = replace_collection(engine, collection, ids, documents, metadatas, embeddings)
    context.log.info(f"[gold] {collection} — stored {count}")
    return count
