"""SQLite conversation store. One file, indexed by user id."""

import json
import sqlite3
import threading
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def _now() -> str:
    return datetime.now(UTC).isoformat()


class ThreadRecord:
    def __init__(
        self,
        thread_id: str,
        metadata: dict[str, Any],
        created_at: str,
        updated_at: str,
        messages: list[dict[str, Any]],
        interactions: list[dict[str, str]],
    ) -> None:
        self.thread_id = thread_id
        self.metadata = metadata
        self.created_at = created_at
        self.updated_at = updated_at
        self.messages = messages
        self.interactions = interactions

    def public(self) -> dict[str, Any]:
        return {
            "thread_id": self.thread_id,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    def state(self) -> dict[str, Any]:
        return {
            "values": {
                "messages": self.messages,
                "interactions_found": self.interactions,
            }
        }


class ThreadStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.Lock()
        path.parent.mkdir(parents=True, exist_ok=True)
        with self._session() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS threads (
                    thread_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL DEFAULT '',
                    metadata TEXT NOT NULL,
                    messages TEXT NOT NULL,
                    interactions TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS threads_user_updated ON threads (user_id, updated_at)"
            )

    def create(self, metadata: dict[str, Any]) -> ThreadRecord:
        thread_id = str(uuid.uuid4())
        now = _now()
        user_id = str(metadata.get("user_id") or "")
        record = ThreadRecord(thread_id, metadata, now, now, [], [])
        with self._session() as conn:
            conn.execute(
                """
                INSERT INTO threads (
                    thread_id, user_id, metadata, messages, interactions, created_at, updated_at
                ) VALUES (?, ?, ?, '[]', '[]', ?, ?)
                """,
                (thread_id, user_id, json.dumps(metadata), now, now),
            )
        return record

    def get(self, thread_id: str) -> ThreadRecord | None:
        with self._session() as conn:
            row = conn.execute("SELECT * FROM threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if row is None:
            return None
        return _row(row)

    def search(self, user_id: str, limit: int) -> list[ThreadRecord]:
        with self._session() as conn:
            rows = conn.execute(
                """
                SELECT * FROM threads
                WHERE user_id = ?
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (user_id, limit),
            ).fetchall()
        return [_row(row) for row in rows]

    def update_metadata(self, thread_id: str, metadata: dict[str, Any]) -> ThreadRecord | None:
        current = self.get(thread_id)
        if current is None:
            return None
        merged = {**current.metadata, **metadata}
        user_id = str(merged.get("user_id") or "")
        now = _now()
        with self._session() as conn:
            conn.execute(
                """
                UPDATE threads
                SET metadata = ?, user_id = ?, updated_at = ?
                WHERE thread_id = ?
                """,
                (json.dumps(merged), user_id, now, thread_id),
            )
        return self.get(thread_id)

    def delete(self, thread_id: str) -> bool:
        with self._session() as conn:
            cursor = conn.execute("DELETE FROM threads WHERE thread_id = ?", (thread_id,))
        return cursor.rowcount > 0

    def save_turn(
        self,
        thread_id: str,
        messages: list[dict[str, Any]],
        interactions: list[dict[str, str]],
    ) -> None:
        now = _now()
        with self._session() as conn:
            conn.execute(
                """
                UPDATE threads
                SET messages = ?, interactions = ?, updated_at = ?
                WHERE thread_id = ?
                """,
                (json.dumps(messages), json.dumps(interactions), now, thread_id),
            )

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    @contextmanager
    def _session(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            conn = self._connect()
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()


def _row(row: sqlite3.Row) -> ThreadRecord:
    metadata = json.loads(row["metadata"])
    messages = json.loads(row["messages"])
    interactions = json.loads(row["interactions"])
    return ThreadRecord(
        thread_id=row["thread_id"],
        metadata=metadata if isinstance(metadata, dict) else {},
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        messages=messages if isinstance(messages, list) else [],
        interactions=interactions if isinstance(interactions, list) else [],
    )
