"""Thread store. Uses a temporary sqlite file."""

from pathlib import Path

from medox.api.store import ThreadStore


def _store(tmp_path: Path) -> ThreadStore:
    return ThreadStore(tmp_path / "threads.sqlite")


def test_search_is_scoped_to_the_user(tmp_path: Path) -> None:
    store = _store(tmp_path)
    own = store.create({"user_id": "a", "title": "Mine"})
    store.create({"user_id": "b", "title": "Other"})

    found = store.search("a", limit=10)
    assert [item.thread_id for item in found] == [own.thread_id]


def test_metadata_patch_keeps_the_user(tmp_path: Path) -> None:
    store = _store(tmp_path)
    created = store.create({"user_id": "a"})
    updated = store.update_metadata(created.thread_id, {"title": "Interactions"})
    assert updated is not None
    assert updated.metadata["title"] == "Interactions"
    assert updated.metadata["user_id"] == "a"
    assert store.search("a", limit=10)[0].metadata["title"] == "Interactions"


def test_save_turn_round_trips_messages(tmp_path: Path) -> None:
    store = _store(tmp_path)
    created = store.create({"user_id": "a"})
    store.save_turn(
        created.thread_id,
        [
            {"type": "human", "content": "Bonjour", "id": "h1"},
            {"type": "ai", "content": "Réponse", "id": "a1"},
        ],
        [{"niveau_contrainte": "Contre-indication", "detail": "A + B"}],
    )
    loaded = store.get(created.thread_id)
    assert loaded is not None
    assert loaded.messages[1]["content"] == "Réponse"
    assert loaded.state()["values"]["interactions_found"][0]["detail"] == "A + B"


def test_delete(tmp_path: Path) -> None:
    store = _store(tmp_path)
    created = store.create({"user_id": "a"})
    assert store.delete(created.thread_id) is True
    assert store.get(created.thread_id) is None
    assert store.delete(created.thread_id) is False
