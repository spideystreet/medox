"""FastAPI application. Replaces the LangGraph dev server on port 2024."""

import json
import os
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from medox.api.agent import (
    Activity,
    Conversation,
    ModelClient,
    history_from_messages,
    iter_conversation,
)
from medox.api.mistral_client import MistralModel
from medox.api.store import ThreadStore

DispatchFn = Callable[[str, dict[str, Any]], str]
ModelFactory = Callable[[str], ModelClient]


class ThreadCreate(BaseModel):
    metadata: dict[str, Any] = Field(default_factory=dict)


class ThreadSearch(BaseModel):
    metadata: dict[str, Any] = Field(default_factory=dict)
    limit: int = 50


class ThreadPatch(BaseModel):
    metadata: dict[str, Any] = Field(default_factory=dict)


class RunInput(BaseModel):
    messages: list[dict[str, Any]] = Field(default_factory=list)


class RunRequest(BaseModel):
    assistant_id: str = "medox_agent"
    input: RunInput = Field(default_factory=RunInput)
    config: dict[str, Any] = Field(default_factory=dict)


def create_app(
    store: ThreadStore | None = None,
    model_factory: ModelFactory | None = None,
    dispatch: DispatchFn | None = None,
) -> FastAPI:
    app = FastAPI(title="Medox")
    app.state.store = store or ThreadStore(_default_db_path())
    app.state.model_factory = model_factory or (lambda key: MistralModel(key))
    app.state.dispatch = dispatch or _dispatch_tool

    @app.get("/ok")
    def ok() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    @app.post("/threads")
    def create_thread(body: ThreadCreate) -> dict[str, Any]:
        return _store(app).create(body.metadata).public()

    @app.post("/threads/search")
    def search_threads(body: ThreadSearch) -> list[dict[str, Any]]:
        user_id = str(body.metadata.get("user_id") or "")
        limit = min(max(body.limit, 1), 100)
        return [record.public() for record in _store(app).search(user_id, limit)]

    @app.patch("/threads/{thread_id}")
    def patch_thread(thread_id: str, body: ThreadPatch) -> dict[str, Any]:
        updated = _store(app).update_metadata(thread_id, body.metadata)
        if updated is None:
            raise HTTPException(status_code=404, detail="Thread not found")
        return updated.public()

    @app.delete("/threads/{thread_id}")
    def delete_thread(thread_id: str) -> dict[str, bool]:
        if not _store(app).delete(thread_id):
            raise HTTPException(status_code=404, detail="Thread not found")
        return {"ok": True}

    @app.get("/threads/{thread_id}/state")
    def thread_state(thread_id: str) -> dict[str, Any]:
        record = _store(app).get(thread_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Thread not found")
        return record.state()

    @app.post("/threads/{thread_id}/history")
    def thread_history(thread_id: str) -> list[dict[str, Any]]:
        record = _store(app).get(thread_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Thread not found")
        return [record.state()]

    @app.post("/threads/{thread_id}/runs/stream")
    def stream_run(thread_id: str, body: RunRequest) -> StreamingResponse:
        record = app.state.store.get(thread_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Thread not found")
        text = _latest_human(body.input.messages)
        if not text:
            raise HTTPException(status_code=400, detail="Message is empty")
        api_key = _server_api_key()
        return StreamingResponse(
            _events(app, record.thread_id, text, api_key),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return app


def _events(app: FastAPI, thread_id: str, text: str, api_key: str) -> Iterator[str]:
    store = _store(app)
    record = store.get(thread_id)
    if record is None:
        yield _sse("error", {"message": "Thread not found"})
        return
    if not api_key:
        yield _sse("error", {"message": "The server has no model API key configured."})
        yield _sse("end", None)
        return

    prior = list(record.messages)
    human = {"type": "human", "content": text, "id": _message_id("human")}
    conversation: Conversation | None = None
    try:
        model = app.state.model_factory(api_key)
        for event in iter_conversation(
            model,
            history_from_messages([*prior, human]),
            app.state.dispatch,
        ):
            if isinstance(event, Activity):
                yield _sse("status", {"label": event.label})
            else:
                conversation = event
    except Exception as exc:
        yield _sse("error", {"message": str(exc)})
        yield _sse("end", None)
        return
    if conversation is None:
        yield _sse("error", {"message": "No response received."})
        yield _sse("end", None)
        return

    ai = {"type": "ai", "content": conversation.answer, "id": _message_id("ai")}
    store.save_turn(thread_id, [*prior, human, ai], conversation.interactions)
    yield _sse(
        "messages/partial",
        [{"content": conversation.answer, "type": "ai", "id": ai["id"]}],
    )
    yield _sse("end", None)


def _latest_human(messages: list[dict[str, Any]]) -> str:
    for message in reversed(messages):
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()
    return ""


def _server_api_key() -> str:
    """Key used for every chat. Never taken from the browser."""
    for name in ("MISTRAL_API_KEY", "OPENROUTER_API_KEY"):
        value = os.environ.get(name, "").strip()
        if value:
            return value
    return ""


def _sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _message_id(prefix: str) -> str:
    from uuid import uuid4

    return f"{prefix}-{uuid4()}"


def _default_db_path() -> Path:
    override = os.environ.get("MEDOX_SQLITE_PATH")
    if override:
        return Path(override)
    return Path("data/app/threads.sqlite")


def _store(app: FastAPI) -> ThreadStore:
    store = app.state.store
    if not isinstance(store, ThreadStore):
        raise RuntimeError("Thread store is not configured")
    return store


def _dispatch_tool(name: str, arguments: dict[str, Any]) -> str:
    from medox.agent.tools.tool_check_interactions import check_interactions
    from medox.agent.tools.tool_find_generics import find_generics
    from medox.agent.tools.tool_get_rcp import get_rcp
    from medox.agent.tools.tool_search_drug import search_drug

    tools: dict[str, Callable[..., str]] = {
        "search_drug": search_drug,
        "find_generics": find_generics,
        "check_interactions": check_interactions,
        "get_rcp": get_rcp,
    }
    tool = tools.get(name)
    if tool is None:
        return f"Unknown tool: {name}"
    result = tool(**arguments)
    return result if isinstance(result, str) else str(result)


app = create_app()
