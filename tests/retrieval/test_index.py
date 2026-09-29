"""pgvector query helpers. No database required."""

import pytest

from medox.retrieval.index import metadata_filter, vector_literal


def test_vector_literal_is_numeric() -> None:
    assert vector_literal([0.1, -2.0]) == "[0.10000000,-2.00000000]"


def test_vector_literal_rejects_non_finite() -> None:
    with pytest.raises(ValueError):
        vector_literal([float("nan")])


def test_metadata_filter_binds_cis() -> None:
    sql, params = metadata_filter({"cis": "60234100"})
    assert "metadata->>'cis' = :meta_0" in sql
    assert params == {"meta_0": "60234100"}


def test_metadata_filter_empty() -> None:
    assert metadata_filter(None) == ("", {})


def test_metadata_filter_rejects_unknown_key() -> None:
    with pytest.raises(ValueError, match="Unknown metadata key"):
        metadata_filter({"drop": "x"})
