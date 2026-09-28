"""Unit tests for find_generics CIS validation — no DB required."""

import pytest

from medox.agent.tools.tool_find_generics import find_generics


class TestFindGenericsCisValidation:
    def test_non_digit_cis_returns_error(self):
        result = find_generics("doliprane")
        assert "Invalid CIS code" in result
        assert "search_drug" in result

    def test_whitespace_cis_returns_error(self):
        result = find_generics("  ")
        assert "Invalid CIS code" in result

    def test_mixed_alpha_digit_returns_error(self):
        result = find_generics("60abc")
        assert "Invalid CIS code" in result

    @pytest.mark.integration
    def test_valid_digit_cis_not_rejected(self):
        """A valid digit CIS should NOT trigger the validation error."""
        result = find_generics(" 60001154 ")
        assert "Invalid CIS code" not in result
