"""Parse ANSM tool output and flag critical constraint levels."""

import re

CRITICAL_LEVELS: frozenset[str] = frozenset({"contre-indication", "association déconseillée"})

_INTERACTION_RE = re.compile(r"\[([^\]]+)\]\s+(.+?)(?:\n|$)")


def parse_interaction_records(texts: list[str]) -> list[dict[str, str]]:
    """Extract unique interaction lines from tool outputs."""
    seen: set[frozenset[str]] = set()
    interactions: list[dict[str, str]] = []
    for content in texts:
        for match in _INTERACTION_RE.finditer(content):
            level, detail = match.group(1), match.group(2)
            pair = frozenset(part.strip() for part in detail.split("+", 1))
            if pair in seen:
                continue
            seen.add(pair)
            interactions.append({"niveau_contrainte": level, "detail": detail})
    return interactions


def warning_prefix(interactions: list[dict[str, str]]) -> str:
    """Prefix a response when a critical ANSM level was retrieved."""
    critical = [
        item
        for item in interactions
        if item.get("niveau_contrainte", "").lower() in CRITICAL_LEVELS
    ]
    if not critical:
        return ""
    warning_lines = " · ".join(
        f"{item['niveau_contrainte']} — {item['detail']}" for item in critical
    )
    return f"⚠️ {warning_lines}\n\n"
