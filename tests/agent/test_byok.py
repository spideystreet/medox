"""Tests for BYOK (Bring Your Own Key) enforcement in _get_llm and agent_node."""

from unittest.mock import patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from openai import AuthenticationError

from medox.agent.graph_agent import _get_llm, build_agent


class TestGetLlm:
    def test_raises_without_api_key(self):
        with pytest.raises(ValueError, match="No API key provided"):
            _get_llm({})

    def test_raises_with_empty_configurable(self):
        with pytest.raises(ValueError, match="No API key provided"):
            _get_llm({"configurable": {}})

    def test_raises_with_none_key(self):
        with pytest.raises(ValueError, match="No API key provided"):
            _get_llm({"configurable": {"api_key": None}})

    def test_raises_with_empty_string_key(self):
        with pytest.raises(ValueError, match="No API key provided"):
            _get_llm({"configurable": {"api_key": ""}})

    def test_openrouter_key_returns_openrouter_config(self):
        llm = _get_llm({"configurable": {"api_key": "sk-or-v1-test123"}})
        assert isinstance(llm, ChatOpenAI)
        assert llm.model_name == "mistralai/ministral-8b-2512"
        assert str(llm.openai_api_base) == "https://openrouter.ai/api/v1"

    def test_mistral_key_returns_mistral_config(self):
        llm = _get_llm({"configurable": {"api_key": "mistral-test-key-123"}})
        assert isinstance(llm, ChatOpenAI)
        assert llm.model_name == "ministral-8b-latest"
        assert str(llm.openai_api_base) == "https://api.mistral.ai/v1"


class TestAgentNodeErrorHandling:
    """Verify that auth errors return a user-friendly message instead of crashing."""

    def test_no_api_key_returns_error_message(self):
        graph = build_agent()
        state = {"messages": [HumanMessage(content="bonjour")]}
        result = graph.invoke(state, config={"configurable": {}})
        last = result["messages"][-1]
        assert isinstance(last, AIMessage)
        assert "Configuration error" in last.content

    def test_invalid_api_key_returns_error_message(self):
        graph = build_agent()
        state = {"messages": [HumanMessage(content="bonjour")]}

        mock_request = type("Request", (), {"method": "POST", "url": "https://openrouter.ai/api/v1/chat/completions", "headers": {}})()
        mock_response = type("Response", (), {
            "status_code": 401,
            "headers": {},
            "request": mock_request,
            "json": lambda self: {"error": {"message": "User not found.", "code": 401}},
        })()

        with patch.object(
            ChatOpenAI,
            "invoke",
            side_effect=AuthenticationError(
                message="User not found.",
                response=mock_response,
                body={"error": {"message": "User not found."}},
            ),
        ):
            result = graph.invoke(
                state,
                config={"configurable": {"api_key": "sk-or-v1-invalid-key"}},
            )
            last = result["messages"][-1]
            assert isinstance(last, AIMessage)
            assert "Invalid API key" in last.content
