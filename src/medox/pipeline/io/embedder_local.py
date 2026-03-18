"""
Local embedding function for ChromaDB using sentence-transformers (HuggingFace).
Model is downloaded and cached locally on first use — zero API cost, HDS-compatible.
Singleton: the model is loaded once and reused across all calls.
"""

import threading

from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

_instances: dict[str, SentenceTransformerEmbeddingFunction] = {}
_lock = threading.Lock()


def get_embedding_function(model_name: str) -> SentenceTransformerEmbeddingFunction:
    """Return a singleton ChromaDB-compatible embedding function."""
    if model_name not in _instances:
        with _lock:
            if model_name not in _instances:
                _instances[model_name] = SentenceTransformerEmbeddingFunction(
                    model_name=model_name,
                )
    return _instances[model_name]
