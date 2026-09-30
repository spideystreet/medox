"""OpenRouter is the only chat provider."""

from unittest.mock import MagicMock, patch

from medox.api.mistral_client import OPENROUTER_SERVER, client_for_key


def test_client_always_uses_openrouter(monkeypatch) -> None:
    monkeypatch.delenv("OPENROUTER_MODEL", raising=False)
    with patch("medox.api.mistral_client.Mistral", return_value=MagicMock()) as mistral:
        _client, model = client_for_key("sk-or-test")
    mistral.assert_called_once_with(api_key="sk-or-test", server_url=OPENROUTER_SERVER)
    assert model == "mistralai/ministral-8b-2512"


def test_openrouter_model_override(monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_MODEL", "mistralai/mistral-small")
    with patch("medox.api.mistral_client.Mistral", return_value=MagicMock()):
        _client, model = client_for_key("sk-or-test")
    assert model == "mistralai/mistral-small"
