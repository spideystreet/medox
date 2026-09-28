"""Unit tests for get_rcp CIS validation — no DB required."""

import pytest

from medox.agent.tools.tool_get_rcp import format_safety_notice, get_rcp


class TestGetRcpCisValidation:
    def test_non_digit_cis_returns_error(self):
        result = get_rcp("aspirine")
        assert "Invalid CIS code" in result
        assert "search_drug" in result

    def test_whitespace_cis_returns_error(self):
        result = get_rcp("  ")
        assert "Invalid CIS code" in result

    def test_mixed_alpha_digit_returns_error(self):
        result = get_rcp("12abc")
        assert "Invalid CIS code" in result

    @pytest.mark.integration
    def test_valid_digit_cis_not_rejected(self):
        """A valid digit CIS should NOT trigger the validation error."""
        result = get_rcp(" 60001154 ")
        assert "Invalid CIS code" not in result


class TestFormatSafetyNotice:
    def test_strips_html_and_keeps_the_link(self):
        raw = "<a href='https://ansm.sante.fr/info'>Fluoropyrimidines : point d&#39;information</a>"
        text = format_safety_notice(raw)
        assert "<a" not in text
        assert "Fluoropyrimidines : point d'information" in text
        assert "https://ansm.sante.fr/info" in text

    def test_plain_text_is_unchanged(self):
        assert format_safety_notice("Déjà propre") == "Déjà propre"
