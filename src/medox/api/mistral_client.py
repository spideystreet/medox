"""Official Mistral SDK client (mistralai 3).

OpenRouter keys use the same chat-completions shape via server_url.
https://docs.mistral.ai/getting-started/quickstarts/developer/build-an-agent
"""

import json
from typing import Any, cast

from mistralai.client import Mistral

from medox.api.agent import ToolCall, Turn

MISTRAL_MODEL = "ministral-8b-latest"
OPENROUTER_MODEL = "mistralai/ministral-8b-2512"
OPENROUTER_SERVER = "https://openrouter.ai/api"


def client_for_key(api_key: str) -> tuple[Mistral, str]:
    """Return a SDK client and the model id for a Mistral or OpenRouter key."""
    if api_key.startswith("sk-or-"):
        return Mistral(api_key=api_key, server_url=OPENROUTER_SERVER), OPENROUTER_MODEL
    return Mistral(api_key=api_key), MISTRAL_MODEL


class MistralModel:
    def __init__(self, api_key: str) -> None:
        self._client, self._model = client_for_key(api_key)

    def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> Turn:
        response = self._client.chat.complete(
            model=self._model,
            messages=cast(Any, messages),
            tools=cast(Any, tools),
            tool_choice="auto",
            parallel_tool_calls=False,
            temperature=0.2,
            http_headers={"X-Title": "Medox"},
        )
        message = response.choices[0].message
        if message is None:
            return Turn(content="", tool_calls=[])
        content = message.content if isinstance(message.content, str) else ""
        calls: list[ToolCall] = []
        for call in message.tool_calls or []:
            function = getattr(call, "function", None)
            if function is None:
                continue
            calls.append(
                ToolCall(
                    call_id=str(getattr(call, "id", "") or ""),
                    name=str(function.name),
                    arguments=_arguments(function.arguments),
                )
            )
        return Turn(content=content or "", tool_calls=calls)


def _arguments(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    return {}
