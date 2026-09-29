"""Sources cited by the tools that actually ran."""

import re

_CIS = re.compile(r"CIS\s+(\d+)", re.IGNORECASE)
_LEVEL = re.compile(r"\[([^\]]+)\]\s+(.+)")


def collect_sources(runs: list[tuple[str, str]]) -> list[dict[str, str]]:
    """Turn tool outputs into the short list shown under an answer."""
    seen: set[tuple[str, str]] = set()
    items: list[dict[str, str]] = []

    def add(kind: str, title: str, detail: str) -> None:
        key = (kind, detail)
        if not detail or key in seen:
            return
        seen.add(key)
        items.append({"kind": kind, "title": title, "detail": detail})

    for name, output in runs:
        if name in {"search_drug", "find_generics"}:
            for cis in _CIS.findall(output):
                add("bdpm", "BDPM", f"CIS {cis}")
        elif name == "check_interactions":
            add("ansm", "Thésaurus ANSM", _interaction_detail(output))
        elif name == "get_rcp":
            add("notice", "Information ANSM", _notice_detail(output))
            for cis in _CIS.findall(output):
                add("bdpm", "BDPM", f"CIS {cis}")
    return items


def _interaction_detail(output: str) -> str:
    match = _LEVEL.search(output)
    if match:
        return f"{match.group(1)} · {match.group(2).strip()}"
    return "Interaction consultée"


def _notice_detail(output: str) -> str:
    for line in output.splitlines():
        text = line.strip()
        if text and not text.startswith("ANSM safety"):
            return text[:140]
    return "Notice consultée"
