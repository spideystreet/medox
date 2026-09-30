"""HTTP contract used by the React client. The model is scripted."""

from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from medox.api.agent import ToolCall, Turn
from medox.api.app import create_app
from medox.api.store import ThreadStore


class ScriptedModel:
    def __init__(self, turns: list[Turn]) -> None:
        self.turns = list(turns)

    def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> Turn:
        assert messages[0]["role"] == "system"
        assert tools
        return self.turns.pop(0)


def _client(
    tmp_path: Path,
    turns: list[Turn],
    calls: list[tuple[str, dict[str, Any]]],
) -> TestClient:
    def dispatch(name: str, arguments: dict[str, Any]) -> str:
        calls.append((name, arguments))
        return "[Contre-indication] AMIODARONE + WARFARINE\nNature du risque: hémorragie"

    app = create_app(
        store=ThreadStore(tmp_path / "threads.sqlite"),
        model_factory=lambda _key: ScriptedModel(turns),
        dispatch=dispatch,
    )
    return TestClient(app)


def test_health(tmp_path: Path) -> None:
    client = TestClient(create_app(store=ThreadStore(tmp_path / "threads.sqlite")))
    assert client.get("/ok").json() == {"ok": True}
    assert client.get("/health").json() == {"ok": True}


def test_stream_persists_the_answer_and_warns(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    calls: list[tuple[str, dict[str, Any]]] = []
    turns = [
        Turn(
            "",
            [
                ToolCall(
                    "c1",
                    "check_interactions",
                    {"substance_a": "amiodarone", "substance_b": "warfarine"},
                )
            ],
        ),
        Turn("Association à éviter.", []),
    ]
    client = _client(tmp_path, turns, calls)
    created = client.post("/threads", json={"metadata": {"user_id": "u1"}}).json()
    thread_id = created["thread_id"]

    response = client.post(
        f"/threads/{thread_id}/runs/stream",
        json={
            "input": {"messages": [{"role": "human", "content": "Interaction ?"}]},
        },
    )
    assert response.status_code == 200
    assert "event: status" in response.text
    assert "Réflexion" in response.text
    assert "Lecture du thésaurus ANSM" in response.text
    assert "event: messages/partial" in response.text
    assert "Contre-indication" in response.text
    assert "event: end" in response.text
    assert calls == [
        ("check_interactions", {"substance_a": "amiodarone", "substance_b": "warfarine"})
    ]

    state = client.get(f"/threads/{thread_id}/state").json()
    contents = [message["content"] for message in state["values"]["messages"]]
    assert contents[0] == "Interaction ?"
    assert contents[1].startswith("⚠️")
    assert "Association à éviter." in contents[1]
    sources = state["values"]["messages"][1]["sources"]
    assert sources[0]["kind"] == "ansm"
    assert "Thésaurus ANSM" == sources[0]["title"]


def test_mistral_key_is_ignored(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MISTRAL_API_KEY", "mistral-secret")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    client = _client(tmp_path, [Turn("nope", [])], [])
    created = client.post("/threads", json={"metadata": {"user_id": "u1"}}).json()
    response = client.post(
        f"/threads/{created['thread_id']}/runs/stream",
        json={"input": {"messages": [{"content": "Bonjour"}]}},
    )
    assert "event: error" in response.text
    assert "no model API key" in response.text


def test_missing_key_is_an_error_event(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    client = _client(tmp_path, [Turn("nope", [])], [])
    created = client.post("/threads", json={"metadata": {"user_id": "u1"}}).json()
    response = client.post(
        f"/threads/{created['thread_id']}/runs/stream",
        json={"input": {"messages": [{"content": "Bonjour"}]}},
    )
    assert "event: error" in response.text
    assert "no model API key" in response.text


def test_search_lists_only_the_caller(tmp_path: Path) -> None:
    client = _client(tmp_path, [], [])
    client.post("/threads", json={"metadata": {"user_id": "u1", "title": "A"}})
    client.post("/threads", json={"metadata": {"user_id": "u2", "title": "B"}})
    listed = client.post("/threads/search", json={"metadata": {"user_id": "u1"}, "limit": 10})
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["metadata"]["title"] == "A"
