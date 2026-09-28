"""Ranked retrieval over the Chroma gold indexes.

Indexes are HNSW. New collections use cosine distance and the E5 query/passage
prefixes required by intfloat/multilingual-e5-base. Older collections stay on
their original space and are not distance-filtered, so a cutoff for the wrong
metric cannot drop every hit.
"""

from typing import Any

COSINE_MAX_DISTANCE = 0.42
E5_QUERY_PREFIX = "query: "
E5_PASSAGE_PREFIX = "passage: "

COLLECTION_METADATA: dict[str, str | int | float | bool] = {
    "hnsw:space": "cosine",
    "hnsw:M": 16,
    "hnsw:construction_ef": 200,
    "hnsw:search_ef": 128,
    "embedding_prompt": "e5",
}


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


def rows_from_query(result: dict[str, Any]) -> list[Hit]:
    """Flatten one Chroma query response into hits. Missing fields become empty."""
    docs = _first(result.get("documents"))
    metas = _first(result.get("metadatas"))
    dists = _first(result.get("distances"))
    ids = _first(result.get("ids"))
    hits: list[Hit] = []
    for index, doc in enumerate(docs):
        meta = metas[index] if index < len(metas) and isinstance(metas[index], dict) else {}
        raw_distance = dists[index] if index < len(dists) else None
        distance = raw_distance if isinstance(raw_distance, int | float) else None
        hit_id = ids[index] if index < len(ids) and isinstance(ids[index], str) else None
        hits.append(Hit(document=str(doc or ""), metadata=meta, distance=distance, hit_id=hit_id))
    return hits


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


def semantic_query(
    collection: Any,
    text: str,
    *,
    n_results: int,
    where: dict[str, Any] | None = None,
) -> list[Hit]:
    """Query a collection and apply the distance policy for its index space."""
    meta = collection.metadata or {}
    prompt = meta.get("embedding_prompt")
    space = str(meta.get("hnsw:space") or "l2")
    kwargs: dict[str, Any] = {
        "query_texts": [prepare_query(text, str(prompt) if isinstance(prompt, str) else None)],
        "n_results": n_results,
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where
    return filter_hits(rows_from_query(collection.query(**kwargs)), space=space, limit=n_results)


def _first(value: Any) -> list[Any]:
    if isinstance(value, list) and value and isinstance(value[0], list):
        return list(value[0])
    return []
