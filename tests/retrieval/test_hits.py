"""Retrieval ranking. No database required."""

from medox.retrieval.hits import (
    Hit,
    display_document,
    filter_hits,
    prepare_query,
)


def _hit(distance: float, document: str = "doc") -> Hit:
    return Hit(document=document, metadata={"cis": 1}, distance=distance)


class TestPrepareQuery:
    def test_e5_prefix(self) -> None:
        assert prepare_query("doliprane", "e5") == "query: doliprane"

    def test_other_index_is_unchanged(self) -> None:
        assert prepare_query("doliprane", None) == "doliprane"

    def test_does_not_double_prefix(self) -> None:
        assert prepare_query("query: doliprane", "e5") == "query: doliprane"


class TestDisplayDocument:
    def test_strips_passage_prefix(self) -> None:
        assert display_document("passage: Doliprane") == "Doliprane"

    def test_leaves_plain_text(self) -> None:
        assert display_document("Doliprane") == "Doliprane"


class TestFilterHits:
    def test_cosine_drops_weak_matches(self) -> None:
        hits = [_hit(0.2, "near"), _hit(0.9, "far")]
        kept = filter_hits(hits, space="cosine", limit=5)
        assert [hit.document for hit in kept] == ["near"]

    def test_cosine_keeps_one_borderline_hit(self) -> None:
        hits = [_hit(0.5, "border"), _hit(0.9, "far")]
        kept = filter_hits(hits, space="cosine", limit=5)
        assert [hit.document for hit in kept] == ["border"]

    def test_cosine_drops_a_very_far_only_hit(self) -> None:
        kept = filter_hits([_hit(0.8)], space="cosine")
        assert kept == []

    def test_l2_does_not_apply_the_cosine_cutoff(self) -> None:
        hits = [_hit(1.4, "a"), _hit(0.2, "b")]
        kept = filter_hits(hits, space="l2", limit=2)
        assert [hit.document for hit in kept] == ["b", "a"]
