"""
Medox ReAct agent — LangGraph graph definition.
Architecture: agent (LLM + tools) → guardrail → response|warn
"""

import threading
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from openai import AuthenticationError, PermissionDeniedError
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import ToolNode
from pydantic import SecretStr

from medox.agent.model_state import AgentState
from medox.agent.nodes.node_guardrail import guardrail_node, should_warn
from medox.agent.nodes.node_response import response_node
from medox.agent.nodes.node_warn import warn_node
from medox.agent.tools.tool_check_interactions import check_interactions
from medox.agent.tools.tool_find_generics import find_generics
from medox.agent.tools.tool_get_rcp import get_rcp
from medox.agent.tools.tool_search_drug import search_drug

TOOLS = [search_drug, find_generics, check_interactions, get_rcp]
RECURSION_LIMIT = 25

SYSTEM_PROMPT = """\
Tu es un assistant pharmaceutique français spécialisé dans la BDPM.

RÈGLES OBLIGATOIRES :
1. Toujours appeler check_interactions avant toute recommandation.
2. Ne jamais donner de conseil médical direct — toujours citer le RCP.
3. Toujours inclure le code CIS quand tu mentionnes un médicament.
4. Rapporter chaque interaction trouvée avec son niveau de contrainte ANSM.
5. Si check_interactions ne trouve pas d'interaction, le signaler tel quel \
— ne jamais compléter avec des connaissances pharmacologiques hors outil.

FORMAT DE RÉPONSE — STRICT :
- Direct et concis. 3 à 5 phrases maximum.
- Prose simple, pas de listes à puces ni titres.
- Ne jamais poser de questions de suivi.
- Énoncer le niveau d'interaction, le risque et la précaution clé."""


def _get_llm(config: RunnableConfig) -> ChatOpenAI:
    """Build LLM from user-provided API key (BYOK only, no server-side fallback)."""
    user_key = (config.get("configurable") or {}).get("api_key")
    if not user_key:
        raise ValueError("No API key provided. Configure your key in settings.")

    if user_key.startswith("sk-or-"):
        base_url = "https://openrouter.ai/api/v1"
        model = "mistralai/ministral-8b-2512"
    else:
        base_url = "https://api.mistral.ai/v1"
        model = "ministral-8b-latest"

    return ChatOpenAI(
        base_url=base_url,
        api_key=SecretStr(user_key),
        model=model,
        default_headers={"X-Title": "Medox"},
    )


def routing(state: AgentState) -> str:
    """Conditional edge: route to tools if there are pending tool calls, else to guardrail."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return "guardrail"


def build_agent() -> CompiledStateGraph:  # type: ignore[type-arg]
    def agent_node(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
        try:
            llm = _get_llm(config)
        except ValueError as exc:
            return {"messages": [AIMessage(content=f"Configuration error: {exc}")]}

        llm_with_tools = llm.bind_tools(TOOLS, parallel_tool_calls=False)
        messages = list(state["messages"])
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages

        try:
            return {"messages": [llm_with_tools.invoke(messages)]}
        except (AuthenticationError, PermissionDeniedError):
            return {
                "messages": [
                    AIMessage(
                        content="Invalid API key. Please check your key in settings "
                        "and make sure it's a valid OpenRouter or Mistral API key."
                    )
                ]
            }

    builder = StateGraph(AgentState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", ToolNode(TOOLS))
    builder.add_node("guardrail", guardrail_node)
    builder.add_node("response", response_node)
    builder.add_node("warn", warn_node)

    builder.add_edge(START, "agent")
    builder.add_conditional_edges("agent", routing, {"tools": "tools", "guardrail": "guardrail"})
    builder.add_edge("tools", "agent")
    builder.add_conditional_edges(
        "guardrail", should_warn, {"response": "response", "warn": "warn"}
    )
    builder.add_edge("response", END)
    builder.add_edge("warn", END)

    return builder.compile()


_graph: CompiledStateGraph | None = None  # type: ignore[type-arg]
_graph_lock = threading.Lock()


def get_graph() -> CompiledStateGraph:  # type: ignore[type-arg]
    """Lazy singleton — avoids requiring env vars at import time."""
    global _graph  # noqa: PLW0603
    if _graph is None:
        with _graph_lock:
            if _graph is None:
                _graph = build_agent()
    return _graph


# LangGraph Studio / langgraph dev expects a module-level `graph` attribute.
# Use __getattr__ so the graph is only built when actually accessed at runtime.
def __getattr__(name: str) -> object:
    if name == "graph":
        return get_graph()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
