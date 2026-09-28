"""Fetch ANSM important safety notices linked from the BDPM for a CIS code."""

import html
import re

from medox.agent.queries import get_rcp_info

_TAG = re.compile(r"<[^>]+>")
_HREF = re.compile(r"""href=['"]([^'"]+)['"]""", re.IGNORECASE)


def format_safety_notice(raw: str) -> str:
    """Turn an HTML notice into plain text plus its link, when there is one."""
    href = _HREF.search(raw)
    text = html.unescape(_TAG.sub(" ", raw))
    text = re.sub(r"\s+", " ", text).strip()
    url = href.group(1) if href else ""
    if url and url not in text:
        return f"{text} — {url}" if text else url
    return text


def get_rcp(cis: str) -> str:
    """
    Get ANSM important safety notices for a drug, by CIS code.
    This is not the full RCP. Cite the notice and its link when one is returned.
    """
    cis = cis.strip()
    if not cis.isdigit():
        return f"Invalid CIS code '{cis}'. Use search_drug to find the CIS code first."

    rows = get_rcp_info(int(cis))

    if not rows:
        return (
            f"No ANSM safety notice found for CIS {cis}. "
            "Refer to base-donnees-publique.medicaments.gouv.fr"
        )

    lines = [f"ANSM safety notices for CIS {cis}:"]
    for row in rows:
        date = f"(from {row.date_debut}) " if row.date_debut else ""
        notice = format_safety_notice(row.texte_info_importante or "")
        lines.append(f"  {date}{notice or '(see the BDPM record)'}")
    return "\n".join(lines)
