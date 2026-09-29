from medox.agent.sources import collect_sources


def test_interaction_lookup_cites_the_thesaurus() -> None:
    sources = collect_sources(
        [
            (
                "check_interactions",
                "[Contre-indication] AMIODARONE + WARFARINE\nNature du risque: hémorragie",
            )
        ]
    )
    assert sources == [
        {
            "kind": "ansm",
            "title": "Thésaurus ANSM",
            "detail": "Contre-indication · AMIODARONE + WARFARINE",
        }
    ]


def test_drug_search_cites_each_cis_once() -> None:
    sources = collect_sources(
        [
            ("search_drug", "CIS 111: Doliprane\n\nCIS 111: encore"),
            ("find_generics", "CIS 222: Doliprane générique"),
        ]
    )
    assert [item["detail"] for item in sources] == ["CIS 111", "CIS 222"]
    assert {item["kind"] for item in sources} == {"bdpm"}
