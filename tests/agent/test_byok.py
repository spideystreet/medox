"""Tests for BYOK (Bring Your Own Key) enforcement in _get_llm."""

import pytest
from langchain_openai import ChatOpenAI

from medox.agent.graph_agent import _get_llm


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
