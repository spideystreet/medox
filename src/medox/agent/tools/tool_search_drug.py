"""Semantic drug search in ChromaDB idx_bdpm_medicament_v1."""

import chromadb

from medox.pipeline.config_pipeline import PipelineSettings
from medox.pipeline.io.embedder_local import get_embedding_function
from medox.retrieval.hits import display_document, semantic_query


def search_drug(query: str) -> str:
    """
    Search for drug information by name, active substance, or description.
    Returns up to 5 relevant drugs with their CIS code, denomination, and key metadata.
    """
    settings = PipelineSettings()
    client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    ef = get_embedding_function(settings.embedding_model)

    collection = client.get_collection("idx_bdpm_medicament_v1", embedding_function=ef)  # type: ignore[arg-type]
    where = {"cis": int(query)} if query.strip().isdigit() else None
    hits = semantic_query(collection, query, n_results=8, where=where)

    if not hits:
        return f"No drugs found for query: {query!r}"

    lines = []
    for hit in hits:
        lines.append(f"CIS {hit.metadata['cis']}: {display_document(hit.document)}")
    return "\n\n".join(lines)
