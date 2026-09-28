"""Critical ANSM levels used by the safety prefix."""

from medox.agent.safety import CRITICAL_LEVELS


def test_contains_the_two_critical_levels() -> None:
    assert CRITICAL_LEVELS == frozenset({"contre-indication", "association déconseillée"})
