"""Mistral tool loop. The model proposes calls; we run them and send results back.

https://docs.mistral.ai/getting-started/quickstarts/developer/build-an-agent
"""

import json
from collections.abc import Callable, Iterator
from typing import Any, Protocol

from medox.agent.safety import parse_interaction_records, warning_prefix

MAX_ROUNDS = 6

SYSTEM_PROMPT = """\
Tu es un assistant pharmaceutique français spécialisé dans la BDPM.

RÈGLES OBLIGATOIRES :
1. Toujours appeler check_interactions avant toute recommandation.
2. Ne jamais donner de conseil médical direct. Citer le code CIS et, \
s'il existe, l'information importante ANSM renvoyée par l'outil.
3. Toujours inclure le code CIS quand tu mentionnes un médicament.
4. Rapporter chaque interaction trouvée avec son niveau de contrainte ANSM.
5. Si check_interactions ne trouve pas d'interaction, le signaler tel quel \
— ne jamais compléter avec des connaissances pharmacologiques hors outil.

FORMAT DE RÉPONSE — STRICT :
- Direct et concis. 3 à 5 phrases maximum.
- Prose simple, pas de listes à puces ni titres.
- Ne jamais poser de questions de suivi.
- Énoncer le niveau d'interaction, le risque et la précaution clé."""

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_drug",
            "description": (
                "Search for a drug by name, active substance, or description. "
                "Returns up to 5 drugs with CIS code and denomination."
            ),
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_generics",
            "description": "Find generic equivalents for a drug identified by its CIS code.",
            "parameters": {
                "type": "object",
                "properties": {"cis": {"type": "string"}},
                "required": ["cis"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_interactions",
            "description": (
                "Check the ANSM thesaurus for an interaction between two DCI names. "
                "Always call this before a recommendation."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "substance_a": {"type": "string"},
                    "substance_b": {"type": "string"},
                },
                "required": ["substance_a", "substance_b"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_rcp",
            "description": (
                "Get ANSM important safety notices for a drug by CIS code. "
                "This is not the full RCP."
            ),
            "parameters": {
                "type": "object",
                "properties": {"cis": {"type": "string"}},
                "required": ["cis"],
            },
        },
    },
]


class ToolCall:
    def __init__(self, call_id: str, name: str, arguments: dict[str, Any]) -> None:
        self.call_id = call_id
        self.name = name
        self.arguments = arguments


class Turn:
    def __init__(self, content: str, tool_calls: list[ToolCall]) -> None:
        self.content = content
        self.tool_calls = tool_calls


class ModelClient(Protocol):
    def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> Turn: ...


Dispatch = Callable[[str, dict[str, Any]], str]


class Conversation:
    def __init__(self, answer: str, interactions: list[dict[str, str]]) -> None:
        self.answer = answer
        self.interactions = interactions


class Activity:
    """A short status the UI can show while the model or a tool is working."""

    def __init__(self, label: str) -> None:
        self.label = label


_TOOL_LABELS = {
    "search_drug": "Recherche dans la BDPM",
    "find_generics": "Recherche des génériques",
    "check_interactions": "Lecture du thésaurus ANSM",
    "get_rcp": "Lecture des informations ANSM",
}


def tool_label(name: str) -> str:
    return _TOOL_LABELS.get(name, "Recherche")


def iter_conversation(
    model: ModelClient,
    history: list[dict[str, str]],
    dispatch: Dispatch,
) -> Iterator[Activity | Conversation]:
    """Yield a status before each model or tool step, then the final answer."""
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend({"role": item["role"], "content": item["content"]} for item in history)
    tool_outputs: list[str] = []

    for _ in range(MAX_ROUNDS):
        yield Activity("Réflexion")
        turn = model.complete(messages, TOOLS)
        if not turn.tool_calls:
            yield _finish(turn.content, tool_outputs)
            return

        messages.append(
            {
                "role": "assistant",
                "content": turn.content or "",
                "tool_calls": [
                    {
                        "id": call.call_id,
                        "type": "function",
                        "function": {
                            "name": call.name,
                            "arguments": json.dumps(call.arguments),
                        },
                    }
                    for call in turn.tool_calls
                ],
            }
        )
        for call in turn.tool_calls:
            yield Activity(tool_label(call.name))
            try:
                result = dispatch(call.name, call.arguments)
            except Exception as exc:
                result = f"Tool {call.name} failed: {exc}"
            tool_outputs.append(result)
            messages.append(
                {
                    "role": "tool",
                    "name": call.name,
                    "content": result,
                    "tool_call_id": call.call_id,
                }
            )

    yield _finish(None, tool_outputs, exhausted=True)


def run_conversation(
    model: ModelClient,
    history: list[dict[str, str]],
    dispatch: Dispatch,
) -> Conversation:
    """Run tool rounds, then attach a critical-interaction warning when needed."""
    for event in iter_conversation(model, history, dispatch):
        if isinstance(event, Conversation):
            return event
    return Conversation(
        answer="Aucune réponse n'a pu être produite à partir des sources.", interactions=[]
    )


def _finish(
    content: str | None,
    tool_outputs: list[str],
    *,
    exhausted: bool = False,
) -> Conversation:
    interactions = parse_interaction_records(tool_outputs)
    if exhausted:
        body = "La recherche n'a pas abouti dans la limite d'étapes."
    else:
        body = (
            content or ""
        ).strip() or "Aucune réponse n'a pu être produite à partir des sources."
    return Conversation(answer=warning_prefix(interactions) + body, interactions=interactions)


def history_from_messages(messages: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Map stored chat messages to Mistral roles."""
    history: list[dict[str, str]] = []
    for message in messages:
        kind = message.get("type")
        content = message.get("content")
        if kind == "human" and isinstance(content, str):
            history.append({"role": "user", "content": content})
        elif kind == "ai" and isinstance(content, str):
            history.append({"role": "assistant", "content": content})
    return history
