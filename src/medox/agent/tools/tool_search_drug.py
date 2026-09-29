"""Semantic drug search in the pgvector index idx_bdpm_medicament_v1."""

from medox.retrieval.hits import display_document
from medox.retrieval.index import MEDICAMENT_INDEX, search_collection


def search_drug(query: str) -> str:
    """
    Search for drug information by name, active substance, or description.
    Returns up to 5 relevant drugs with their CIS code, denomination, and key metadata.
    """
    where = {"cis": query.strip()} if query.strip().isdigit() else None
    hits = search_collection(MEDICAMENT_INDEX, query, n_results=8, where=where)

    if not hits:
        return f"No drugs found for query: {query!r}"

    lines = []
    for hit in hits:
        lines.append(f"CIS {hit.metadata['cis']}: {display_document(hit.document)}")
    return "\n\n".join(lines)
