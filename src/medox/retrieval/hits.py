"""Ranked retrieval over the gold indexes.

Indexes use cosine distance and the E5 query/passage prefixes required by
intfloat/multilingual-e5-base. A non-cosine space skips the cutoff.
"""

from typing import Any

COSINE_MAX_DISTANCE = 0.42
E5_QUERY_PREFIX = "query: "
E5_PASSAGE_PREFIX = "passage: "


class Hit:
    def __init__(
        self,
        document: str,
        metadata: dict[str, Any],
        distance: float | None,
        hit_id: str | None = None,
    ) -> None:
        self.document = document
        self.metadata = metadata
        self.distance = distance
        self.hit_id = hit_id


def prepare_query(text: str, embedding_prompt: str | None) -> str:
    """Prefix E5 queries. Leave other indexes untouched."""
    if embedding_prompt == "e5" and not text.startswith(E5_QUERY_PREFIX):
        return f"{E5_QUERY_PREFIX}{text}"
    return text


def display_document(document: str) -> str:
    """Drop the embedding prefix before the text is shown to the model."""
    if document.startswith(E5_PASSAGE_PREFIX):
        return document[len(E5_PASSAGE_PREFIX) :]
    return document


def filter_hits(
    hits: list[Hit],
    *,
    space: str,
    limit: int = 5,
    max_cosine_distance: float = COSINE_MAX_DISTANCE,
) -> list[Hit]:
    """Keep the nearest hits. Cosine indexes drop weak matches."""
    ordered = sorted(hits, key=lambda hit: hit.distance if hit.distance is not None else 0.0)
    if space != "cosine":
        return ordered[:limit]

    kept = [hit for hit in ordered if hit.distance is None or hit.distance <= max_cosine_distance]
    if not kept and ordered:
        nearest = ordered[0].distance
        if nearest is not None and nearest <= max_cosine_distance + 0.12:
            kept = ordered[:1]
    return kept[:limit]
