"""Local embeddings with sentence-transformers. The model is loaded once."""

import threading
from typing import Any

_models: dict[str, Any] = {}
_lock = threading.Lock()


def embed_texts(model_name: str, texts: list[str]) -> list[list[float]]:
    """Embed texts with the named HuggingFace model. Empty input returns []."""
    if not texts:
        return []
    vectors = _model(model_name).encode(list(texts), convert_to_numpy=True)
    return [[float(value) for value in row] for row in vectors]


def _model(model_name: str) -> Any:
    if model_name not in _models:
        with _lock:
            if model_name not in _models:
                from sentence_transformers import SentenceTransformer

                _models[model_name] = SentenceTransformer(model_name)
    return _models[model_name]
